function isArrayOfNumbers(arr: any): arr is number[] {
    if (!Array.isArray(arr)) return false;
    return arr.every((item) => typeof item === "number");
}

export function isArrayOfDates(arr: any): arr is Date[] {
    if (!Array.isArray(arr)) return false;
    return arr.every((item) => item instanceof Date);
}

function isArrayOfStrings(arr: any): arr is string[] {
    if (!Array.isArray(arr)) return false;
    return arr.every((item) => typeof item === "string");
}

function isArrayOfBooleans(arr: any): arr is boolean[] {
    if (!Array.isArray(arr)) return false;
    return arr.every((item) => typeof item === "boolean");
}

