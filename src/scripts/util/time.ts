/**
 * Get the current Unix timestamp
 * @returns Seconds since epoch
 */
export function getUnixTimestamp(): number {
    return Math.round(Date.now() / 1000);
}

/**
 * Adds the specified number of days to a given date.
 *
 * @param date - The date to which the days will be added.
 * @param days - The number of days to add.
 * @returns A new Date object representing the updated date.
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(date.getDate() + days);
    return result;
}
