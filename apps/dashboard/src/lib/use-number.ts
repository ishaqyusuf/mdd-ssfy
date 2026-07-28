export function toFixed(value) {
    const number = typeof value == "string" ? parseFloat(value) : value;
    if (isNaN(value) || !value) return value;
    return number.toFixed(2);
}
export function formatMoney(value) {
    const v = toFixed(value);
    if (!v) return 0;
    return +v;
}

// export function 2dp()
