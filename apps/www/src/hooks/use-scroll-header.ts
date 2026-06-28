"use client";

import { usePathname } from "next/navigation";
import { type RefObject, useEffect, useRef } from "react";

const HEADER_OFFSET_VAR = "--header-offset";
const HEADER_TRANSITION_VAR = "--header-transition";

const HEADER_HEIGHT = 70;

interface UseScrollHeaderOptions {
    extraOffset?: number;
}

export function useScrollHeader(
    scrollRef?: RefObject<HTMLElement | null>,
    options?: UseScrollHeaderOptions,
) {
    const { extraOffset = 0 } = options ?? {};
    const prevHiddenRef = useRef(false);
    const rafRef = useRef<number | null>(null);
    const hasScrolledRef = useRef(false);
    const pathname = usePathname();
    const prevPathnameRef = useRef(pathname);

    useEffect(() => {
        if (prevPathnameRef.current !== pathname) {
            prevPathnameRef.current = pathname;
            prevHiddenRef.current = false;
            hasScrolledRef.current = false;
            document.documentElement.style.setProperty(
                HEADER_OFFSET_VAR,
                "0px",
            );
            document.body.style.overflow = "";
        }
    }, [pathname]);

    useEffect(() => {
        const handleScroll = () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }

            rafRef.current = requestAnimationFrame(() => {
                if (!hasScrolledRef.current) {
                    hasScrolledRef.current = true;
                    document.documentElement.style.setProperty(
                        HEADER_TRANSITION_VAR,
                        "200ms",
                    );
                }

                const scrollTop = scrollRef?.current
                    ? scrollRef.current.scrollTop
                    : window.scrollY || document.documentElement.scrollTop;
                const shouldHide = scrollTop > 0;

                if (shouldHide !== prevHiddenRef.current) {
                    prevHiddenRef.current = shouldHide;
                    const totalOffset = HEADER_HEIGHT + extraOffset;

                    document.documentElement.style.setProperty(
                        HEADER_OFFSET_VAR,
                        shouldHide ? `${totalOffset}px` : "0px",
                    );
                    document.body.style.overflow = shouldHide ? "hidden" : "";
                }

                rafRef.current = null;
            });
        };

        const scrollElement = scrollRef?.current ?? window;

        scrollElement.addEventListener("scroll", handleScroll, {
            passive: true,
        });

        return () => {
            scrollElement.removeEventListener("scroll", handleScroll);

            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }

            hasScrolledRef.current = false;
            document.documentElement.style.setProperty(
                HEADER_TRANSITION_VAR,
                "0s",
            );
            document.documentElement.style.setProperty(
                HEADER_OFFSET_VAR,
                "0px",
            );
            document.body.style.overflow = "";
        };
    }, [extraOffset, scrollRef]);
}
