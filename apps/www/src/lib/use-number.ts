export function convertToNumber(string, defult: any = null) {
    if (typeof string === "number") return string;
    const number = parseFloat(string);

    if (isNaN(number)) {
        return defult; // or return '';
    }

    return number;
}
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
export function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
    }).format(value);
}
export function numeric<T>(cells: (keyof T)[], data) {
    if (data)
        cells.map((cell) => {
            data[cell] = convertToNumber(data[cell]);
        });
    return data;
}

// export function 2dp()
