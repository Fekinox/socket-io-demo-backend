import { Server as SocketIOServer } from "socket.io"
import { ClientInfo } from "../clientInfo.js"
import { LobbyState } from "./lobbyState.js"
import { GameDatabase } from "./gameDatabase.js"

export const SERVER_TICK_RATE_MS = 100

export interface ServerMode {
    update(): void
}

export class GameServer {
    clients: Map<string, ClientInfo>
    messages: Array<string>
    data: ServerMode

    constructor(db: GameDatabase) {
        this.clients = new Map()
        this.messages = []
        this.data = LobbyState.init(db)
    }

    update(io: SocketIOServer): void {
        this.data.update()
        io.emit('gamestate', {
            ...this,
            clients: [...this.clients.keys()],
        })
    }
}

