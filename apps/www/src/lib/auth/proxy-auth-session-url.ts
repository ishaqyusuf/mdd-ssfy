type AuthSessionRequestLike = {
    url: string;
    headers: Pick<Headers, "get">;
};

type AuthSessionUrlEnv = Pick<
    NodeJS.ProcessEnv,
    "PORT" | "PORTLESS_APP_PORT"
>;

export function getAuthSessionUrl(
    req: AuthSessionRequestLike,
    env: AuthSessionUrlEnv = process.env,
) {
    const requestUrl = new URL(req.url);
    const forwardedHost =
        req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";

    if (
        isLocalDevHost(requestUrl.hostname) ||
        isLocalDevHost(forwardedHost)
    ) {
        const appPort =
            env.PORTLESS_APP_PORT ?? env.PORT ?? requestUrl.port ?? "3000";
        return new URL("/api/auth-session", `http://127.0.0.1:${appPort}`);
    }

    return new URL("/api/auth-session", requestUrl);
}

export function isLocalDevHost(hostname: string) {
    const host = normalizeHostName(hostname);

    return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host.endsWith(".localhost") ||
        host.endsWith(".test")
    );
}

function normalizeHostName(hostname: string) {
    const value = hostname.trim().toLowerCase();
    if (!value) return "";

    if (value.startsWith("[")) {
        const bracketEnd = value.indexOf("]");
        return bracketEnd > 0 ? value.slice(1, bracketEnd) : value;
    }

    if (value === "::1") return value;

    return value.split(":")[0] ?? "";
}
