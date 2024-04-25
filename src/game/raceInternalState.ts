import { Horse } from "./horse/horse.js"
import { RACE_DURATION } from "./race.js"

export class RaceInternalState {
    horseStates: Array<HorseState> = []
    rankings: Array<number> = []

    nextState(): RaceInternalState {
        let next = new RaceInternalState()        
        next.horseStates = this.horseStates.map((hs) => {
            let nextHs = new HorseState(hs.horse)
            nextHs.currentSpeed = 
                Math.max(hs.currentSpeed + hs.horse.acceleration,
                         hs.horse.topSpeed)
            nextHs.position = hs.position + hs.currentSpeed
            if (nextHs.position > RACE_DURATION) {
                nextHs.position = RACE_DURATION
                nextHs.finished = true
            }

            return nextHs
        })
        next.recomputeRankings()
        return next
    }

    recomputeRankings() {
        this.rankings.sort((idxI, idxJ) => {
            const posDifference = 
                this.horseStates[idxI].position - this.horseStates[idxJ].position
            if (posDifference > 0.01) { return posDifference }
            else { return idxI - idxJ }
        })
    }

    raceOver() {
        this.horseStates.every((hs) => hs.finished)
    }
}

export class HorseState {
    horse: Horse 
    position: number = 0
    currentSpeed: number = 0
    finished: boolean = false
    constructor(horse: Horse) {
        this.horse = horse
    }
}
