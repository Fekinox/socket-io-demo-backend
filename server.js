import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

function hrTimeMs() {
    const raw = process.hrtime.bigint()
    return raw/1000000n
}

const SERVER_TICK_RATE_MS = 100
let lag = 0n
let prevTime = hrTimeMs()

let serverState = {
    messages: [],
    clients: new Map(),
    status: 'notInGame',
    data: {
        timer: 30000
    }
}

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173'
    }
})

function serverTick() {
    serverState.data.timer -= SERVER_TICK_RATE_MS
    console.log([...serverState.clients.keys()])
    io.emit('gamestate', {
        ...serverState,
        clients: [...serverState.clients.keys()],
    })
}

io.on('connection', (socket) => {
    console.log('a user connected')
    console.log(socket)

    serverState.clients.set(socket.id, {
        socket: socket,
        authed: false,
        username: ''
    })

    socket.onAny((evt) => console.log(evt))

    socket.on('login', ({ username }, cb) => {
        if (!serverState.clients.has(socket.id)) { 
            cb({
                message: 'not in client listing'
            })
            return
        }  
        serverState.clients.get(socket.id).authed = true
        serverState.clients.get(socket.id).username = username
        cb({
            message: 'ok'
        })

        console.log(serverState.clients)
    })

    socket.on('logout', () => {
        if (!serverState.clients.has(socket.id)) { return }
        serverState.clients.get(socket.id).authed = false
        serverState.clients.get(socket.id).username = ''
    })

    socket.on('disconnect', () => {
        console.log('disconnect')
        serverState.clients.delete(socket.id)
    })
})

// setInterval(() => {
//     lag += Date.now() - prevTime
//     prevTime = Date.now()
//     while (lag > SERVER_TICK_RATE_MS) {
//         serverTick()
//         console.log(lag - SERVER_TICK_RATE_MS)
//         lag -= SERVER_TICK_RATE_MS
//     }
// }, SERVER_TICK_RATE_MS)

function loop() {
    setTimeout(loop, SERVER_TICK_RATE_MS)
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
