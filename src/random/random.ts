export function randRange(lo: number, hi: number): number {
    return Math.floor(lo + Math.random() * (hi - lo + 1))
}

export function randFromBounds(bounds: Array<number>): number { return randRange(bounds[0], bounds[1]) }

export function shuffle(arr: Array<any>) {
    // Fisher-Yates shuffle
    for (let i = arr.length-1; i >= 1; i--) {
        const j = Math.floor(Math.random() * (i+1))
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
    }
}

export function randomIndicesNoReplacement(n: number, k: number): Array<number> | null {
    if (n < k) { return null }
    let arr = Array.from({length: n}, (_, i) => i)
    shuffle(arr)
    return arr.slice(0, k)
}
