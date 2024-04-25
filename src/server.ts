import express from 'express'
import { createServer } from 'node:http'
import { Server, Socket } from 'socket.io'
import { SERVER_TICK_RATE_MS, ServerState } from './game/serverState.js'
import { GameDatabase } from './game/gameDatabase.js'

function hrTimeMs(): bigint {
    const raw = process.hrtime.bigint()
    return raw/1000000n
}

let lag = 0n
let prevTime = hrTimeMs()

let db = GameDatabase.create()

let serverState = new ServerState(db)

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173'
    }
})

function serverTick() {
    serverState.data.update()
    io.emit('gamestate', {
        ...serverState,
        clients: [...serverState.clients.keys()],
        lag: Number(lag) - SERVER_TICK_RATE_MS
    })
}

io.on('connection', (socket: Socket) => {
    console.log('a user connected')
    console.log(socket)

    serverState.clients.set(socket.id, {
        socket: socket,
        authed: false,
        username: ''
    })

    socket.onAny((evt) => console.log(evt))

    socket.on('login', ({ username }, cb) => {
        let clientInfo = serverState.clients.get(socket.id)
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

        console.log(serverState.clients)
    })

    socket.on('logout', () => {
        let clientInfo = serverState.clients.get(socket.id)
        if (clientInfo === undefined) { return }
        clientInfo.authed = false
        clientInfo.username = ''
    })

    socket.on('disconnect', () => {
        console.log('disconnect')
        serverState.clients.delete(socket.id)
    })
})

function loop() {
    setTimeout(loop, SERVER_TICK_RATE_MS/4)
    const now = hrTimeMs()
    lag += now - prevTime
    prevTime = now
    while (lag > SERVER_TICK_RATE_MS) {
        serverTick()
        console.log(lag - BigInt(SERVER_TICK_RATE_MS))
        lag -= BigInt(SERVER_TICK_RATE_MS)
    }
}

loop()

server.listen(3000, () => {
    console.log('listening at http://localhost:3000')
})
