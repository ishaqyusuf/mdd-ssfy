import type { ClassValue } from "clsx";
import type { CSSProperties } from "react";

import { cn } from "@gnd/ui/cn";

export type TableColumnSize = {
    size: number;
    minSize: number;
    maxSize: number;
};

function makeSize(
    size: number,
    minSize = size,
    maxSize = size,
): TableColumnSize {
    return {
        size,
        minSize,
        maxSize,
    };
}

export const sizes = {
    xs: makeSize(50, 50, 50),
    sm: makeSize(120, 100, 180),
    md: makeSize(160, 130, 240),
    lg: makeSize(220, 150, 360),
    custom: (minSize: number, maxSize: number, size = minSize) =>
        makeSize(size, minSize, maxSize),
} as const;

export const tableColumnSizeClass =
    "w-[var(--table-column-size)] min-w-[var(--table-column-min-size)]";

export function sizeClass(_size: TableColumnSize, ...className: ClassValue[]) {
    return cn(tableColumnSizeClass, ...className);
}

export function getTableColumnSizeStyle(size: TableColumnSize): CSSProperties {
    return {
        "--table-column-size": `${size.size}px`,
        "--table-column-min-size": `${size.minSize}px`,
        "--table-column-max-size": `${size.maxSize}px`,
    } as CSSProperties;
}

