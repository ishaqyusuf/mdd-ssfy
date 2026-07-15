export function getBaseUrl() {
    if (process.env.NODE_ENV === "development") {
        return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
    }
    return "https://www.gndprodesk.com";
}
