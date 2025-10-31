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
        const handleScroll = throttle(() => {
            if (containerRef.current) {
                const containerRect =
                    containerRef.current.getBoundingClientRect();
                const containerBottomVisible =
                    containerRect.bottom > 0 &&
                    containerRect.bottom <= window.innerHeight;
                const containerPartiallyVisible =
                    containerRect.top < window.innerHeight &&
                    containerRect.bottom > 0;
                const shouldBeFixed = fn(
                    containerBottomVisible,
                    containerPartiallyVisible,
                    {
                        top: containerRect.top,
                        bottom: containerRect.bottom,
                    }
                );

                if (shouldBeFixed && !isFixed) {
                    const containerCenter =
                        containerRect.left + containerRect.width / 2;
                    setFixedOffset(containerCenter);
                }

                setIsFixed(shouldBeFixed);
            }
        }, 500); // Adjust the throttle time as needed (e.g., 100ms)

        window.addEventListener("scroll", handleScroll);
        handleScroll(); // Trigger on mount to set the initial state

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return {
        containerRef,
        fixedOffset,
        isFixed,
        actionRef,
    };
};
