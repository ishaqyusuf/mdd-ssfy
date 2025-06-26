export function getBaseUrl() {
    if (process.env.NODE_ENV === "development") {
        return "http://localhost:3000";
    }
    return "https://gndprodesk.com";
}
export function getPdfDownloadUrl() {
    const url = getBaseUrl();
    return `${url}/api/pdf/download`;
}
