import { Horse } from "./horse/horse.js";

export const RACE_DURATION = 100

export class Race {
    horses: Array<Horse>;

    constructor(horses: Array<Horse>) {
        this.horses = horses 
    }
}
