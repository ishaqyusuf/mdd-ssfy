import type { NewSalesFormSaveDraftInput } from "./schema";

const LOCAL_RECOVERY_VERSION = 1;
const LOCAL_RECOVERY_PREFIX = "new-sales-form:recovery";

export type NewSalesFormRecoverySnapshot = {
    version: number;
    savedAt: string;
    payload: NewSalesFormSaveDraftInput;
};

function isBrowser() {
    return typeof window !== "undefined" && !!window.localStorage;
}

export function getRecoveryStorageKey(source: {
    type: "order" | "quote";
    slug?: string | null;
    salesId?: string | number | null;
}) {
    const scope = String(source.slug || source.salesId || "draft").trim() || "draft";
    return `${LOCAL_RECOVERY_PREFIX}:${source.type}:${scope}`;
}

export function writeRecoverySnapshot(
    key: string,
    payload: NewSalesFormSaveDraftInput,
) {
    if (!isBrowser()) return;
    const snapshot: NewSalesFormRecoverySnapshot = {
        version: LOCAL_RECOVERY_VERSION,
        savedAt: new Date().toISOString(),
        payload,
    };
    try {
        window.localStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
        // Ignore storage write failures (quota/privacy mode).
    }
}

export function readRecoverySnapshot(key: string): NewSalesFormRecoverySnapshot | null {
    if (!isBrowser()) return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as NewSalesFormRecoverySnapshot;
        if (
            !parsed ||
            parsed.version !== LOCAL_RECOVERY_VERSION ||
            !parsed.savedAt ||
            !parsed.payload
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function clearRecoverySnapshot(key: string) {
    if (!isBrowser()) return;
    try {
        window.localStorage.removeItem(key);
    } catch {
        // Ignore storage failures.
    }
}

export function createPayloadFingerprint(payload: NewSalesFormSaveDraftInput | null) {
    if (!payload) return "";
    return JSON.stringify({
        meta: payload.meta,
        lineItems: payload.lineItems,
        extraCosts: payload.extraCosts,
        summary: payload.summary,
        type: payload.type,
    });
}
