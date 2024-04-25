import { Server as HTTPServer } from 'node:http'
import { Socket, Server as SocketIOServer } from "socket.io"
import { ClientInfo } from "../clientInfo.js"
import { GameDatabase } from "./gameDatabase.js"
import { hrTimeMs } from "../time.js"
import { Race } from './race.js'
import { RaceState } from './raceState.js'

export const SERVER_TICK_RATE_MS = 100

export const BETTING_DELAY = 10
export const PRERACE_DELAY = 3
export const RESULTS_DELAY = 10

/** The base server for the game. */
export class GameServer {
    /** Internal Socket.IO server. */
    io: SocketIOServer
    /** Reference to the game database. */
    db: GameDatabase
    /** Map between the Socket.IO ids of each client and a container
    *   for their client info */
    clients: Map<string, ClientInfo>

    messages: Array<string>

    lag: bigint = 0n
    prevTime: bigint = hrTimeMs()

    /** The current race, if it exists. */
    race: Race | null = null
    /** Current server status.
    * Betting - Race is visible to all players. Players may send 'bet' actions
    * to indicate that they will bet a certain amount on a horse to win.
    * Race - Race is being simulated.
    * Results - Race has finished, and the game server will simply display
    * the finished status. */
    status: 'betting' | 'race' | 'results' = 'betting'

    /** Timer that ticks down to zero in betting mode before a race begins. */
    bettingTimer: number = 0
    /** Timer that ticks down to zero in race mode before a race begins. */
    preRaceTimer: number = 0
    /** Timer that ticks down to zero in results mode before a new round begins. */
    resultsTimer: number = 0

    /** Array of all race states */
    raceStates: Array<RaceState> | null = null

    constructor(db: GameDatabase, server: HTTPServer) {
        // Create a new Socket.IO server using the given HTTP connection.
        this.io = new SocketIOServer(server, {
            cors: {
                credentials: true,
                origin: [
                    // Vite React default origin
                    'http://localhost:5173'

                    // ... other origins here...
                ]
            }
        })
        this.db = db

        this.clients = new Map()
        this.messages = []

        // For each client that connects to the server, set up the corresponding
        // event listeners.
        this.io.on('connection', (socket: Socket) => {
            console.log('a user connected')
            console.log(socket)

            // Initially clients are unauthenticated. Clients may authenticate
            // themselves by sending a 'login' message to the server.
            this.clients.set(socket.id, {
                socket: socket,
                authed: false,
                username: ''
            })

            // Log all events as they come in.
            socket.onAny((evt, ...args) => console.log(evt, args))

            // Client attempted to login.
            socket.on('login', ({ username }, cb) => {
                let clientInfo = this.clients.get(socket.id)
                // If client doesn't exist somehow, inform client that
                // their info isn't in the list of clients in the server.
                if (clientInfo === undefined) {
                    cb({
                        message: 'not in client listing'
                    })
                    return
                }
                clientInfo.authed = true
                clientInfo.username = username
                // Inform user that authentication was successful
                cb({
                    message: 'ok'
                })
            })

            // Client attempted to logout.
            socket.on('logout', () => {
                let clientInfo = this.clients.get(socket.id)
                if (clientInfo === undefined) { return }
                clientInfo.authed = false
                clientInfo.username = ''
            })

            // Client closed the connection.
            socket.on('disconnect', () => {
                this.clients.delete(socket.id)
            })

            // Client sent an action to the server.
            socket.on('action', (payload) => {
                this.handleAction(payload)
            })
        })

        this.startBettingMode()
        this.emitState(0n)
    }

    startBettingMode() {
        this.status = 'betting'
        this.race = this.db.createRace()
        this.bettingTimer = BETTING_DELAY * 1000
        this.raceStates = null
    }

    startRaceMode() {
        this.status = 'race'
        this.preRaceTimer = PRERACE_DELAY * 1000
        if (this.race === null) { throw new Error('no race') }
        this.raceStates = [new RaceState(this.race)]
    }

    startResultsMode() {
        this.status = 'results'
        this.resultsTimer = RESULTS_DELAY * 1000
    }

    handleAction(payload: any) {
        console.log(payload)
    }

    handleTick(): void {
        switch(this.status) {
        case 'betting':
            if (this.bettingTimer > 0) {
                this.bettingTimer -= SERVER_TICK_RATE_MS
                return
            }

            this.startRaceMode()
            return
        case 'race':
            if (this.preRaceTimer > 0) {
                this.preRaceTimer -= SERVER_TICK_RATE_MS
                return
            }

            // Otherwise, compute the next state and add it to the
            // list of race states in memory
            if (this.raceStates === null) { throw new Error('no race states') }
            const currentState = this.raceStates[this.raceStates.length-1]

            if (currentState.raceOver()) {
                this.startResultsMode()
                return
            }

            const nextState = currentState.nextState()
            this.raceStates.push(nextState)
            break;
        case 'results':
            if (this.resultsTimer > 0) {
                this.resultsTimer -= SERVER_TICK_RATE_MS
                return
            }
            // start a new race if we're autorestarting
            break;
        }
    }

    emitState(lag: bigint): void {
        switch(this.status) {
        case 'betting':
            this.io.emit('gamestate', {
                status: this.status,
                clients: [...this.clients.keys()],
                messages: this.messages,
                lag: Number(lag) - SERVER_TICK_RATE_MS,

                race: this.race,
                bettingTimer: this.bettingTimer
            })
            break;
        case 'race':
            this.io.emit('gamestate', {
                status: this.status,
                clients: [...this.clients.keys()],
                messages: this.messages,
                lag: Number(lag) - SERVER_TICK_RATE_MS,

                preRaceTimer: this.preRaceTimer,
                raceStates:
                    (this.raceStates === null)
                    ? null
                    : this.raceStates[this.raceStates.length-1]
            })
            break;
        case 'results':
            this.io.emit('gamestate', {
                status: this.status,
                clients: [...this.clients.keys()],
                messages: this.messages,
                lag: Number(lag) - SERVER_TICK_RATE_MS,

                resultsTimer: this.resultsTimer,
                raceStates:
                    (this.raceStates === null)
                    ? null
                    : this.raceStates[this.raceStates.length-1]
            })
            break;
        }
    }

    // Start the main server loop.
    mainLoop() {
        this.prevTime = hrTimeMs()
        const runner = () => {
            setTimeout(runner, SERVER_TICK_RATE_MS/4)
            // Some amount of time passed between the current and previous
            // calls to `runner`, so compute that and add it to lag.
            const now = hrTimeMs()
            this.lag += now - this.prevTime
            this.prevTime = now
            // While the server is still behind by at least the tick rate,
            // iteratively update the server and reduce the lag.
            // Additionally pass the current lag 
            while (this.lag > SERVER_TICK_RATE_MS) {
                this.handleTick()
                this.emitState(this.lag)
                console.log(this.lag - BigInt(SERVER_TICK_RATE_MS))
                this.lag -= BigInt(SERVER_TICK_RATE_MS)
            }
        }

        runner()
    }
}

