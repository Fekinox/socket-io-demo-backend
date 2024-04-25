/** Returns a random integer in the range (lo, hi) inclusive. */
export function randRange(lo: number, hi: number): number {
    return Math.floor(lo + Math.random() * (hi - lo + 1))
}

/** Returns a random element from the range described by the two-value array `bounds`. */
export function randFromBounds(bounds: Array<number>): number { return randRange(bounds[0], bounds[1]) }

/** Shuffles the array in-place using the Fisher-Yates algorithm. */
export function shuffle(arr: Array<any>) {
    // Fisher-Yates shuffle
    for (let i = 0; i < arr.length-1; i++) {
        const j = Math.floor(i + Math.random() * (arr.length-i))
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
    }
}

/** Returns a random subset of [0, n) of size k. Will return null if k > n.
* The order of the elements in the subset is randomized.
*/
export function randomIndicesNoReplacement(n: number, k: number): Array<number> | null {
    if (n < k) { return null }
    let arr = Array.from({length: n}, (_, i) => i)
    for (let i = 0; i < k-1; i++) {
        const j = Math.floor(i + Math.random() * (arr.length-i))
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
    }
    return arr.slice(0, k)
}
