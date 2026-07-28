"use client";

import { cn } from "@gnd/ui/cn";
import type { VisibilityState } from "@tanstack/react-table";
import { useCallback, useMemo, type CSSProperties } from "react";

import type { StickyColumnConfig } from "@/components/tables-2/core";

interface TableColumn {
    id: string;
    getIsVisible: () => boolean;
}

interface TableInterface {
    getAllLeafColumns: () => TableColumn[];
}

interface UseStickyColumnsProps {
    columnVisibility?: VisibilityState;
    table?: TableInterface;
    loading?: boolean;
    stickyColumns?: StickyColumnConfig[];
}

export function useStickyColumns({
    columnVisibility,
    table,
    loading,
    stickyColumns = [],
}: UseStickyColumnsProps) {
    const isVisible = useCallback(
        (id: string) =>
            Boolean(
                loading ||
                table
                    ?.getAllLeafColumns()
                    .find((column) => column.id === id)
                    ?.getIsVisible() ||
                (columnVisibility && columnVisibility[id] !== false),
            ),
        [columnVisibility, loading, table],
    );

    const stickyColumnIds = useMemo(
        () => new Set(stickyColumns.map((column) => column.id)),
        [stickyColumns],
    );

    const stickyPositions = useMemo(() => {
        const checkVisible = (id: string) =>
            loading ||
            table
                ?.getAllLeafColumns()
                .find((column) => column.id === id)
                ?.getIsVisible() ||
            (columnVisibility && columnVisibility[id] !== false);

        let position = 0;
        const positions: Record<string, number> = {};

        for (const column of stickyColumns) {
            if (!checkVisible(column.id)) continue;

            positions[column.id] = position;
            position += column.width;
        }

        return positions;
    }, [columnVisibility, loading, stickyColumns, table]);

    const getStickyStyle = useCallback(
        (columnId: string): CSSProperties => {
            const position = stickyPositions[columnId];
            return position !== undefined
                ? ({ "--stick-left": `${position}px` } as CSSProperties)
                : {};
        },
        [stickyPositions],
    );

    const getStickyClassName = useCallback(
        (columnId: string, baseClassName?: string) => {
            const isSticky = stickyColumnIds.has(columnId);

            return cn(
                baseClassName,
                isSticky && "md:sticky md:left-[var(--stick-left)]",
            );
        },
        [stickyColumnIds],
    );

    return {
        stickyPositions,
        getStickyStyle,
        getStickyClassName,
        isVisible,
    };
}
