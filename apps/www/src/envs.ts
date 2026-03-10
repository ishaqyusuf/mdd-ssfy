export function getBaseUrl() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const configuredUrl = appUrl || nextAuthUrl;
    if (configuredUrl) {
        if (
            configuredUrl.startsWith("http://") ||
            configuredUrl.startsWith("https://")
        ) {
            return configuredUrl;
        }
        return `${process.env.NODE_ENV === "production" ? "https" : "http"}://${configuredUrl}`;
    }
    return process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://www.gndprodesk.com";
}
export function getPdfDownloadUrl() {
    const url = getBaseUrl();
    return `${url}/api/pdf/download`;
}
