import { randFromBounds } from "../../random/random.js";

export const SPEED_BOUNDS = [50, 100]
export const ACCELERATION_BOUNDS = [1,5]
export const STAMINA_BOUNDS = [500, 600]

export class Horse {
    topSpeed: number;
    stamina: number;
    acceleration: number;
    id: number;

    static random(id: number) {
        return new Horse({
            id: id,
            topSpeed: randFromBounds(SPEED_BOUNDS),
            acceleration: randFromBounds(ACCELERATION_BOUNDS),
            stamina: randFromBounds(STAMINA_BOUNDS),
        })
    }

    constructor({
        id = 0,
        topSpeed = 5,
        stamina = 5,
        acceleration = 5,
    }) {
        this.id = id
        this.topSpeed = topSpeed
        this.stamina = stamina
        this.acceleration = acceleration
    }
}
