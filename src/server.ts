import express from 'express'
import { createServer } from 'node:http'
import { Server, Socket } from 'socket.io'
import { SERVER_TICK_RATE_MS, GameServer } from './game/serverState.js'
import { GameDatabase } from './game/gameDatabase.js'
import { hrTimeMs } from './time.js'

let lag = 0n
let prevTime = hrTimeMs()

const app = express()
const server = createServer(app)

let db = GameDatabase.create()
let serverState = new GameServer(db, server)

serverState.mainLoop()

server.listen(3000, () => {
    console.log('listening at http://localhost:3000')
})
