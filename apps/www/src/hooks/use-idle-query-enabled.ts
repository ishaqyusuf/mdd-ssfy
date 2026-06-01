"use client";

import { useEffect, useState } from "react";

type IdleWindow = Window & {
    requestIdleCallback?: (
        callback: () => void,
        options?: { timeout?: number },
    ) => number;
    cancelIdleCallback?: (id: number) => void;
};

export function useIdleQueryEnabled(timeout = 750) {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        if (enabled) return;

        const win = window as IdleWindow;

        if (typeof win.requestIdleCallback === "function") {
            const id = win.requestIdleCallback(() => setEnabled(true), {
                timeout,
            });
            return () => win.cancelIdleCallback?.(id);
        }

        const id = window.setTimeout(() => setEnabled(true), timeout);
        return () => window.clearTimeout(id);
    }, [enabled, timeout]);

    return enabled;
}
