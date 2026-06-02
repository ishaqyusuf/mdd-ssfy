import type { ReactNode } from "react";

interface ScrollableContentProps {
    children: ReactNode;
}

export function ScrollableContent({ children }: ScrollableContentProps) {
    return (
        <div
            className="transition-transform"
            style={{
                transform: "translateY(calc(var(--header-offset, 0px) * -1))",
                transitionDuration: "var(--header-transition, 200ms)",
                willChange: "transform",
            }}
        >
            {children}
        </div>
    );
}
