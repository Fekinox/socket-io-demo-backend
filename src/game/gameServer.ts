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
    io: SocketIOServer
    db: GameDatabase
    clients: Map<string, ClientInfo>
    messages: Array<string>

    race: Race | null = null
    status: 'betting' | 'race' | 'results'
    bettingTimer: number = 0
    preRaceTimer: number = 0
    resultsTimer: number = 0

    raceStates: Array<RaceState> | null = null

    constructor(db: GameDatabase, server: HTTPServer) {
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
        const race = db.createRace()

        if (race === null) { throw new Error('could not create race') }

        this.status = 'betting'
        this.race = race

        this.io.on('connection', (socket: Socket) => {
            console.log('a user connected')
            console.log(socket)

            this.clients.set(socket.id, {
                socket: socket,
                authed: false,
                username: ''
            })

            socket.onAny((evt) => console.log(evt))

            socket.on('login', ({ username }, cb) => {
                let clientInfo = this.clients.get(socket.id)
                if (clientInfo === undefined) {
                    cb({
                        message: 'not in client listing'
                    })
                    return
                }
                clientInfo.authed = true
                clientInfo.username = username
                cb({
                    message: 'ok'
                })

                console.log(this.clients)
            })

            socket.on('logout', () => {
                let clientInfo = this.clients.get(socket.id)
                if (clientInfo === undefined) { return }
                clientInfo.authed = false
                clientInfo.username = ''
            })

            socket.on('disconnect', () => {
                this.clients.delete(socket.id)
            })

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

    mainLoop() {
        let lag = 0n
        let prevTime = hrTimeMs()

        const runner = () => {
            setTimeout(runner, SERVER_TICK_RATE_MS/4)
            const now = hrTimeMs()
            lag += now - prevTime
            prevTime = now
            while (lag > SERVER_TICK_RATE_MS) {
                this.handleTick()
                this.emitState(lag)
                console.log(lag - BigInt(SERVER_TICK_RATE_MS))
                lag -= BigInt(SERVER_TICK_RATE_MS)
            }
        }

        runner()
    }
}

