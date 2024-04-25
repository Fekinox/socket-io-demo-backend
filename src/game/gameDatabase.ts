import { randomIndicesNoReplacement } from "../random/random.js"
import { Horse } from "./horse/horse.js"
import { Race } from "./race.js"

const HORSE_POPULATION = 1000
const HORSES_PER_RACE = 4

export class GameDatabase {
    horses: Array<Horse> = []

    static create(): GameDatabase {
        let db = new GameDatabase
        db.horses = Array.from(
            {length: HORSE_POPULATION},
            (_v, i) => Horse.random(i)
        )
        return db
    }

    createRace(): Race | null {
        console.log('creating race')
        let indices = randomIndicesNoReplacement(HORSE_POPULATION, HORSES_PER_RACE) 
        if (indices === null) { return null }
        console.log('created race')
        return new Race(indices.map((i) => this.horses[i]))
    }
}
