"use client";

import { cn } from "@gnd/ui/cn";
import type { Header } from "@tanstack/react-table";

interface ResizeHandleProps<TData> {
    header: Header<TData, unknown>;
    className?: string;
}

export function ResizeHandle<TData>({
    header,
    className,
}: ResizeHandleProps<TData>) {
    if (!header.column.getCanResize()) return null;

    return (
        <div
            onDoubleClick={() => header.column.resetSize()}
            onMouseDown={(event) => {
                event.stopPropagation();
                header.getResizeHandler()(event);
            }}
            onTouchStart={(event) => {
                event.stopPropagation();
                header.getResizeHandler()(event);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
                "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                "bg-transparent hover:bg-border",
                className,
            )}
            style={{
                transform: "translateX(50%)",
            }}
        />
    );
}
