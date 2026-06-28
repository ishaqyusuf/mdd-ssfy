export function isArrayOfDates(arr: any): arr is Date[] {
    if (!Array.isArray(arr)) return false;
    return arr.every((item) => item instanceof Date);
}
