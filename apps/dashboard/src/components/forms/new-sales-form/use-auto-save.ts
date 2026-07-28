import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSaveDraftNewSalesFormMutation } from "./api";
import type { NewSalesFormSaveDraftInput } from "./schema";

type AutoSaveReason = "debounced-change" | "manual-flush";
type AutoSaveFlushOptions = {
    force?: boolean;
};

type UseNewSalesFormAutoSaveOptions = {
    enabled?: boolean;
    delayMs?: number;
    dirty: boolean;
    payload: NewSalesFormSaveDraftInput | null;
    onSaving?: (payload: NewSalesFormSaveDraftInput, reason: AutoSaveReason) => void;
    onSaved?: (response: any, payload: NewSalesFormSaveDraftInput) => void;
    onError?: (error: unknown, payload: NewSalesFormSaveDraftInput) => void;
    onStale?: (error: unknown, payload: NewSalesFormSaveDraftInput) => void;
};

function isStaleError(error: any) {
    const code = error?.data?.code || error?.shape?.data?.code;
    const message = String(error?.message || "").toLowerCase();
    return code === "CONFLICT" || message.includes("out of date");
}

export function useNewSalesFormAutoSave(options: UseNewSalesFormAutoSaveOptions) {
    const {
        enabled = true,
        delayMs = 1000,
        dirty,
        payload,
        onSaving,
        onSaved,
        onError,
        onStale,
    } = options;

    const saveDraft = useSaveDraftNewSalesFormMutation();

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);
    const queuePromiseRef = useRef<Promise<any | null> | null>(null);
    const queuedPayloadRef = useRef<NewSalesFormSaveDraftInput | null>(null);
    const manualFlushRef = useRef(false);
    const mountedRef = useRef(true);

    const [queued, setQueued] = useState(false);
    const [lastAttemptAt, setLastAttemptAt] = useState<string | null>(null);

    const payloadKey = useMemo(() => {
        if (!payload) return "";
        return JSON.stringify({
            salesId: payload.salesId,
            slug: payload.slug,
            version: payload.version,
            summary: payload.summary,
            lineItems: payload.lineItems,
            meta: payload.meta,
        });
    }, [payload]);
    const payloadRef = useRef(payload);
    payloadRef.current = payload;

    const clearTimer = useCallback(() => {
        if (!timerRef.current) return;
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);

    const processQueue = useCallback(async () => {
        if (queuePromiseRef.current) return queuePromiseRef.current;

        queuePromiseRef.current = (async () => {
            inFlightRef.current = true;
            let latestResponse: any | null = null;

            try {
                while (mountedRef.current && queuedPayloadRef.current) {
                    const next = queuedPayloadRef.current;
                    queuedPayloadRef.current = null;
                    setQueued(false);

                    onSaving?.(
                        next,
                        next.autosave === false
                            ? "manual-flush"
                            : "debounced-change",
                    );
                    setLastAttemptAt(new Date().toISOString());
                    latestResponse = null;

                    try {
                        const response = await saveDraft.mutateAsync(next);
                        latestResponse = response;
                        onSaved?.(response, next);
                    } catch (error) {
                        if (isStaleError(error)) onStale?.(error, next);
                        else onError?.(error, next);
                    }
                }

                return latestResponse;
            } finally {
                inFlightRef.current = false;
                queuePromiseRef.current = null;
            }
        })();

        return queuePromiseRef.current;
    }, [onError, onSaved, onSaving, onStale, saveDraft]);

    const enqueueSave = useCallback(
        (nextPayload: NewSalesFormSaveDraftInput) => {
            queuedPayloadRef.current = nextPayload;
            setQueued(true);
            void processQueue();
        },
        [processQueue],
    );
    const enqueueSaveRef = useRef(enqueueSave);
    enqueueSaveRef.current = enqueueSave;

    const flush = useCallback(
        async (
            reason: AutoSaveReason = "manual-flush",
            options: AutoSaveFlushOptions = {},
        ) => {
            clearTimer();
            const force = options.force === true;
            if (
                (!enabled && reason !== "manual-flush" && !force) ||
                (!dirty && !force) ||
                !payload
            ) {
                return null;
            }

            const next = {
                ...payload,
                autosave: reason !== "manual-flush",
            };
            const isManualFlush = reason === "manual-flush";

            if (inFlightRef.current) {
                queuedPayloadRef.current = next;
                setQueued(true);
                if (!isManualFlush) return processQueue();
                manualFlushRef.current = true;
                try {
                    return await processQueue();
                } finally {
                    manualFlushRef.current = false;
                }
            }

            if (isManualFlush) manualFlushRef.current = true;
            onSaving?.(next, reason);
            setLastAttemptAt(new Date().toISOString());

            try {
                const response = await saveDraft.mutateAsync(next);
                onSaved?.(response, next);
                return response;
            } catch (error) {
                if (isStaleError(error)) onStale?.(error, next);
                else onError?.(error, next);
                return null;
            } finally {
                if (isManualFlush) manualFlushRef.current = false;
            }
        },
        [
            clearTimer,
            dirty,
            enabled,
            onError,
            onSaved,
            onSaving,
            onStale,
            payload,
            processQueue,
            saveDraft,
        ],
    );

    const cancelPending = useCallback(() => {
        clearTimer();
        queuedPayloadRef.current = null;
        setQueued(false);
    }, [clearTimer]);

    useEffect(() => {
        const currentPayload = payloadRef.current;
        if (
            !enabled ||
            !dirty ||
            !payloadKey ||
            !currentPayload ||
            manualFlushRef.current
        ) {
            clearTimer();
            return;
        }
        clearTimer();
        timerRef.current = setTimeout(() => {
            enqueueSaveRef.current({
                ...currentPayload,
                autosave: true,
            });
        }, delayMs);
        return clearTimer;
    }, [clearTimer, delayMs, dirty, enabled, payloadKey]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            clearTimer();
        };
    }, [clearTimer]);

    return {
        flush,
        cancelPending,
        queued,
        isSaving: saveDraft.isPending || inFlightRef.current,
        lastAttemptAt,
    };
}
