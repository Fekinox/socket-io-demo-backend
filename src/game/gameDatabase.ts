import { randomIndicesNoReplacement } from "../random/random.js"
import { Horse } from "./horse/horse.js"
import { Race } from "./race.js"

const HORSE_POPULATION = 1000
const HORSES_PER_RACE = 4

/** Data store for horse information.
 * Later on, should update this to a proper database service like MongoDB
 * to store this data persistently.
 */
export class GameDatabase {
    horses: Array<Horse> = []

    static create(): GameDatabase {
        let db = new GameDatabase
        db.horses = Array.from(
            {length: HORSE_POPULATION},
            (_v, i) => Horse.random(i)
        )
        // TODO: implement natural selection so only the highest quality
        // horses are selected
        return db
    }

    /** Create a new race by taking a random sample of horses from the population */
    createRace(): Race | null {
        console.log('creating race')
        let indices = randomIndicesNoReplacement(HORSE_POPULATION, HORSES_PER_RACE) 
        if (indices === null) { return null }
        console.log('created race')
        return new Race(indices.map((i) => this.horses[i]))
    }
}
