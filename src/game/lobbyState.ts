import { GameDatabase } from "./gameDatabase.js";
import { Race } from "./race.js";
import { GameState, SERVER_TICK_RATE_MS } from "./serverState.js";

const LOBBY_WAIT_DURATION = 10 * 1000

export class LobbyState implements GameState {
    status = 'lobby'
    timer: number = 0
    race: Race | null = null

    static init(db: GameDatabase): LobbyState {
        let s = new LobbyState()
        s.timer = LOBBY_WAIT_DURATION
        s.race = db.createRace()

        return s
    }
    update(): void {
        this.timer -= SERVER_TICK_RATE_MS
    }
}
