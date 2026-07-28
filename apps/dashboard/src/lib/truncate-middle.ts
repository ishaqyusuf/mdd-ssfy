export function middleTruncate(value?: string | null, maxLength = 36) {
    if (!value || value.length <= maxLength) return value ?? "";

    const marker = "...";
    if (maxLength <= marker.length) return value.slice(0, maxLength);

    const visibleLength = maxLength - marker.length;
    const startLength = Math.ceil(visibleLength / 2);
    const endLength = Math.floor(visibleLength / 2);
    const end = endLength > 0 ? value.slice(-endLength) : "";

    return `${value.slice(0, startLength)}${marker}${end}`;
}
