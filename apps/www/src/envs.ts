export function getBaseUrl() {
    if (process.env.NODE_ENV === "development") {
        return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";
    }
    return "https://www.gndprodesk.com";
}
export function getPdfDownloadUrl() {
    const url = getBaseUrl();
    return `${url}/api/pdf/download`;
}
