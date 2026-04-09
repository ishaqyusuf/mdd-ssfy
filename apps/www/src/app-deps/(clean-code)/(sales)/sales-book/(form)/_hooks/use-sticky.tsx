import { useEffect, useRef, useState } from "react";
import throttle from "lodash.throttle"; // Install lodash if not already done: npm install lodash.throttle

export type Sticky = ReturnType<typeof useSticky>;
export const useSticky = (
    fn: (
        bottomVisible,
        partiallyVisible,
        anchors: { top: number; bottom?: number }
    ) => boolean,
    defaultFixed = false
) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFixed, setIsFixed] = useState(defaultFixed);
    const [fixedOffset, setFixedOffset] = useState(0);
    const actionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const getScrollParent = (node: HTMLElement | null) => {
            let current = node?.parentElement;

            while (current) {
                const style = window.getComputedStyle(current);
                const overflowY = style.overflowY;
                if (
                    overflowY === "auto" ||
                    overflowY === "scroll" ||
                    overflowY === "overlay"
                ) {
                    return current;
                }
                current = current.parentElement;
            }

            return window;
        };

        const getViewportBounds = (scrollParent: HTMLElement | Window) => {
            if (scrollParent === window) {
                return {
                    top: 0,
                    bottom: window.innerHeight,
                };
            }

            const rect = scrollParent.getBoundingClientRect();
            return {
                top: rect.top,
                bottom: rect.bottom,
            };
        };

        const handleScroll = throttle(() => {
            if (containerRef.current) {
                const scrollParent = getScrollParent(containerRef.current);
                const viewport = getViewportBounds(scrollParent);
                const containerRect =
                    containerRef.current.getBoundingClientRect();
                const containerBottomVisible =
                    containerRect.bottom > viewport.top &&
                    containerRect.bottom <= viewport.bottom;
                const containerPartiallyVisible =
                    containerRect.top < viewport.bottom &&
                    containerRect.bottom > viewport.top;
                const shouldBeFixed = fn(
                    containerBottomVisible,
                    containerPartiallyVisible,
                    {
                        top: containerRect.top,
                        bottom: containerRect.bottom,
                    }
                );

                if (shouldBeFixed) {
                    const containerCenter =
                        containerRect.left + containerRect.width / 2;
                    setFixedOffset(containerCenter);
                }

                setIsFixed(shouldBeFixed);
            }
        }, 50);

        const scrollParent = getScrollParent(containerRef.current);

        if (scrollParent === window) {
            window.addEventListener("scroll", handleScroll, {
                passive: true,
            });
        } else {
            scrollParent.addEventListener("scroll", handleScroll, {
                passive: true,
            });
        }
        window.addEventListener("resize", handleScroll, {
            passive: true,
        });
        handleScroll(); // Trigger on mount to set the initial state

        return () => {
            if (scrollParent === window) {
                window.removeEventListener("scroll", handleScroll);
            } else {
                scrollParent.removeEventListener("scroll", handleScroll);
            }
            window.removeEventListener("resize", handleScroll);
            handleScroll.cancel();
        };
    }, []);

    return {
        containerRef,
        fixedOffset,
        isFixed,
        actionRef,
    };
};
