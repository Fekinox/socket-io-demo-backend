import express from 'express'
import { createServer } from 'node:http'
import { GameServer } from './game/gameServer.js'
import { GameDatabase } from './game/gameDatabase.js'

const app = express()
const server = createServer(app)

let db = GameDatabase.create()
let gameServer = new GameServer(db, server)

gameServer.mainLoop()

server.listen(3000, () => {
    console.log('listening at http://localhost:3000')
})
