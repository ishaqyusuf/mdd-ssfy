"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TimeoutId = ReturnType<typeof window.setTimeout>;

function getProgressColor(progress: number) {
    if (progress >= 100) return "#86efac";
    if (progress >= 84) return "#38bdf8";
    if (progress >= 68) return "#818cf8";
    if (progress >= 42) return "#f59e0b";

    return "#f97316";
}

export function NavigationLoadingBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const routeKey = `${pathname}?${searchParams.toString()}`;
    const timers = useRef<TimeoutId[]>([]);
    const [visible, setVisible] = useState(true);
    const [progress, setProgress] = useState(14);
    const progressColor = getProgressColor(progress);

    const clearTimers = useCallback(() => {
        for (const timer of timers.current) {
            window.clearTimeout(timer);
        }
        timers.current = [];
    }, []);

    const queueTimer = useCallback((callback: () => void, delay: number) => {
        const timer = window.setTimeout(callback, delay);
        timers.current.push(timer);
    }, []);

    const finishLoading = useCallback(() => {
        clearTimers();
        setVisible(true);
        setProgress(100);

        queueTimer(() => {
            setVisible(false);
            setProgress(0);
        }, 280);
    }, [clearTimers, queueTimer]);

    const startLoading = useCallback(() => {
        clearTimers();
        setVisible(true);
        setProgress((current) => (current > 0 && current < 94 ? current : 14));

        queueTimer(() => setProgress((current) => Math.max(current, 42)), 120);
        queueTimer(() => setProgress((current) => Math.max(current, 68)), 420);
        queueTimer(() => setProgress((current) => Math.max(current, 84)), 1200);
        queueTimer(() => setProgress((current) => Math.max(current, 92)), 2400);
        queueTimer(finishLoading, 8000);
    }, [clearTimers, finishLoading, queueTimer]);

    useEffect(() => {
        const settleTimer = window.setTimeout(finishLoading, 180);

        return () => window.clearTimeout(settleTimer);
    }, [routeKey, finishLoading]);

    useEffect(() => {
        function handleDocumentClick(event: MouseEvent) {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const target = event.target as Element | null;
            const anchor = target?.closest("a[href]");

            if (!(anchor instanceof HTMLAnchorElement)) {
                return;
            }

            if (
                (anchor.target && anchor.target !== "_self") ||
                anchor.hasAttribute("download")
            ) {
                return;
            }

            const nextUrl = new URL(anchor.href, window.location.href);
            const currentUrl = new URL(window.location.href);

            if (nextUrl.origin !== currentUrl.origin) {
                return;
            }

            const onlyHashChanged =
                nextUrl.pathname === currentUrl.pathname &&
                nextUrl.search === currentUrl.search &&
                nextUrl.hash !== currentUrl.hash;

            if (nextUrl.href === currentUrl.href || onlyHashChanged) {
                return;
            }

            startLoading();
        }

        function handleDocumentSubmit(event: SubmitEvent) {
            const form = event.target;

            if (!(form instanceof HTMLFormElement)) {
                return;
            }

            if (
                event.defaultPrevented ||
                form.method.toLowerCase() === "dialog" ||
                (form.target && form.target !== "_self")
            ) {
                return;
            }

            startLoading();
        }

        window.addEventListener("beforeunload", startLoading);
        document.addEventListener("click", handleDocumentClick, true);
        document.addEventListener("submit", handleDocumentSubmit, true);

        return () => {
            window.removeEventListener("beforeunload", startLoading);
            document.removeEventListener("click", handleDocumentClick, true);
            document.removeEventListener("submit", handleDocumentSubmit, true);
            clearTimers();
        };
    }, [clearTimers, startLoading]);

    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none fixed inset-x-0 top-0 z-[10000] h-0.5 overflow-hidden print:hidden transition-opacity duration-200 ${
                visible ? "opacity-100" : "opacity-0"
            }`}
        >
            <div
                className="h-full rounded-r-full transition-[width,background-color,box-shadow] duration-300 ease-out"
                style={{
                    width: `${progress}%`,
                    backgroundColor: progressColor,
                    boxShadow: `0 0 14px ${progressColor}`,
                }}
            />
        </div>
    );
}
