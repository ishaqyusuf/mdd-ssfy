// Temporary diagnostic companion to DEBUG-production-route-v1. Remove both
// probes after the Production first-request timeout is understood.
export async function observeProductionProxyAuth<T>(
    url: URL,
    resolveAuth: () => Promise<T>,
): Promise<T> {
    if (
        url.pathname !== "/sales-book/productions" ||
        url.searchParams.get("__productionTiming") !== "1"
    ) {
        return resolveAuth();
    }

    const enteredAt = Date.now();
    const startedAt = performance.now();
    const mark = (phase: "auth_started" | "auth_settled" | "auth_rejected") => {
        try {
            console.info("[DEBUG-production-proxy-v1]", JSON.stringify({
                phase, enteredAt, elapsedMs: Math.round(performance.now() - startedAt),
            }));
        } catch { /* Diagnostics must not change authentication behavior. */ }
    };
    mark("auth_started");
    try {
        const auth = await resolveAuth();
        mark("auth_settled");
        return auth;
    } catch (error) {
        mark("auth_rejected");
        throw error;
    }
}
