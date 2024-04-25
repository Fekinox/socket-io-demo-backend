export function hrTimeMs(): bigint {
    const raw = process.hrtime.bigint()
    return raw/1000000n
}
