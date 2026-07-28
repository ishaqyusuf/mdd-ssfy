type AuthSessionFetch = (
    input: URL,
    init: RequestInit,
) => Promise<Response>;

type FetchAuthSessionOptions = {
    fetchImpl?: AuthSessionFetch;
    retryDelayMs?: number;
};

const TRANSIENT_SOCKET_ERROR_CODES = new Set([
    "UND_ERR_SOCKET",
    "ECONNRESET",
    "ECONNREFUSED",
]);

const DEFAULT_RETRY_DELAY_MS = 50;

export async function fetchAuthSession(
    url: URL,
    init: RequestInit,
    options: FetchAuthSessionOptions = {},
) {
    const fetchImpl = options.fetchImpl ?? fetch;

    try {
        return await fetchImpl(url, init);
    } catch (error) {
        if (!isTransientAuthSessionFetchError(error)) {
            throw error;
        }

        await delay(options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
        return fetchImpl(url, init);
    }
}

export function isTransientAuthSessionFetchError(error: unknown) {
    let current = error;

    for (let depth = 0; depth < 4; depth += 1) {
        if (!current || typeof current !== "object") return false;

        const code = getErrorField(current, "code");
        if (
            typeof code === "string" &&
            TRANSIENT_SOCKET_ERROR_CODES.has(code)
        ) {
            return true;
        }

        const message = getErrorField(current, "message");
        if (
            typeof message === "string" &&
            message.toLowerCase().includes("other side closed")
        ) {
            return true;
        }

        current = getErrorField(current, "cause");
    }

    return false;
}

function getErrorField(error: object, key: string) {
    return (error as Record<string, unknown>)[key];
}

function delay(ms: number) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}
