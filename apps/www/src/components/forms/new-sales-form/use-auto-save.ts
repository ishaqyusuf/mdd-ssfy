import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSaveDraftNewSalesFormMutation } from "./api";
import type { NewSalesFormSaveDraftInput } from "./schema";

type AutoSaveReason = "debounced-change" | "manual-flush" | "unmount";

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
    const queuedPayloadRef = useRef<NewSalesFormSaveDraftInput | null>(null);
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

    const clearTimer = useCallback(() => {
        if (!timerRef.current) return;
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);

    const processQueue = useCallback(async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;

        while (mountedRef.current && queuedPayloadRef.current) {
            const next = queuedPayloadRef.current;
            queuedPayloadRef.current = null;
            setQueued(false);

            onSaving?.(next, "debounced-change");
            setLastAttemptAt(new Date().toISOString());

            try {
                const response = await saveDraft.mutateAsync({
                    ...next,
                    autosave: true,
                });
                onSaved?.(response, next);
            } catch (error) {
                if (isStaleError(error)) onStale?.(error, next);
                else onError?.(error, next);
            }
        }

        inFlightRef.current = false;
    }, [onError, onSaved, onSaving, onStale, saveDraft]);

    const enqueueSave = useCallback(
        (nextPayload: NewSalesFormSaveDraftInput) => {
            queuedPayloadRef.current = nextPayload;
            setQueued(true);
            void processQueue();
        },
        [processQueue],
    );

    const flush = useCallback(
        async (reason: AutoSaveReason = "manual-flush") => {
            clearTimer();
            if ((!enabled && reason !== "manual-flush") || !dirty || !payload) {
                return null;
            }

            const next = {
                ...payload,
                autosave: reason !== "manual-flush",
            };

            if (inFlightRef.current) {
                queuedPayloadRef.current = next;
                setQueued(true);
                return null;
            }

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
            saveDraft,
        ],
    );

    const cancelPending = useCallback(() => {
        clearTimer();
        queuedPayloadRef.current = null;
        setQueued(false);
    }, [clearTimer]);

    useEffect(() => {
        if (!enabled || !dirty || !payload) {
            clearTimer();
            return;
        }
        clearTimer();
        timerRef.current = setTimeout(() => {
            enqueueSave({
                ...payload,
                autosave: true,
            });
        }, delayMs);
        return clearTimer;
    }, [clearTimer, delayMs, dirty, enabled, enqueueSave, payload, payloadKey]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            void flush("unmount");
            clearTimer();
        };
    }, [clearTimer, flush]);

    return {
        flush,
        cancelPending,
        queued,
        isSaving: saveDraft.isPending || inFlightRef.current,
        lastAttemptAt,
    };
}
