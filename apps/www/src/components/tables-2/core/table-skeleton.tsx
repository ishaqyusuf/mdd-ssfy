"use client";

import { cn } from "@gnd/ui/cn";
import { Skeleton } from "@gnd/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import type {
    ColumnDef,
    ColumnSizingState,
    VisibilityState,
} from "@tanstack/react-table";
import { useMemo, type CSSProperties } from "react";

import { SkeletonCell } from "./skeleton-cell";
import { getColumnId, getHeaderLabel, type TableColumnMeta } from "./types";

interface TableSkeletonProps<TData> {
    columns: ColumnDef<TData>[];
    rowCount?: number;
    columnVisibility?: VisibilityState;
    columnSizing?: ColumnSizingState;
    columnOrder?: string[];
    stickyColumnIds?: string[];
    actionsColumnId?: string;
    isEmpty?: boolean;
    className?: string;
}

const HEADER_BACKGROUND_CLASS = "bg-slate-100/90 dark:bg-slate-900/70";
const HEADER_TEXT_CLASS =
    "text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300";

export function TableSkeleton<TData>({
    columns,
    rowCount = 40,
    columnVisibility = {},
    columnSizing = {},
    columnOrder = [],
    stickyColumnIds = [],
    actionsColumnId = "actions",
    isEmpty = false,
    className,
}: TableSkeletonProps<TData>) {
    const rows = useMemo(
        () => [...Array(rowCount)].map((_, i) => ({ id: i.toString() })),
        [rowCount],
    );

    const orderedColumns = useMemo(() => {
        if (columnOrder.length === 0) return columns;

        const ordered = columnOrder
            .map((id) => columns.find((column) => getColumnId(column) === id))
            .filter(Boolean) as typeof columns;
        const orderedIds = new Set(columnOrder);
        const remaining = columns.filter(
            (column) => !orderedIds.has(getColumnId(column)),
        );

        return [...ordered, ...remaining];
    }, [columns, columnOrder]);

    const visibleColumns = useMemo(() => {
        return orderedColumns.filter((column) => {
            const id = getColumnId(column);
            if (id === "select" || id === actionsColumnId) return true;
            return columnVisibility[id] !== false;
        });
    }, [orderedColumns, columnVisibility, actionsColumnId]);

    const stickyPositions = useMemo(() => {
        let position = 0;
        const positions: Record<string, number> = {};

        for (const column of visibleColumns) {
            const columnId = getColumnId(column);
            if (!stickyColumnIds.includes(columnId)) continue;

            const width = columnSizing[columnId] ?? column.size ?? 150;
            positions[columnId] = position;
            position += width;
        }

        return positions;
    }, [columnSizing, stickyColumnIds, visibleColumns]);

    const getStickyStyle = (columnId: string) => {
        const position = stickyPositions[columnId];
        return position !== undefined
            ? ({ "--stick-left": `${position}px` } as CSSProperties)
            : {};
    };

    const getStickyClassName = (columnId: string, baseClassName?: string) => {
        const isSticky = stickyColumnIds.includes(columnId);
        return cn(
            baseClassName,
            isSticky && "md:sticky md:left-[var(--stick-left)]",
        );
    };

    return (
        <div className={cn("w-full", className)}>
            <div
                className={cn(
                    "overflow-auto overscroll-x-none scrollbar-hide",
                    !isEmpty &&
                        "md:border-l md:border-r md:border-b md:border-border",
                )}
            >
                <Table
                    className={cn(
                        isEmpty && "pointer-events-none opacity-20 blur-[7px]",
                    )}
                >
                    <TableHeader
                        className={cn(
                            "sticky top-0 z-20 block border-0",
                            HEADER_BACKGROUND_CLASS,
                        )}
                    >
                        <TableRow className="flex h-[45px] items-center !border-b-0 hover:bg-transparent">
                            {visibleColumns.map((column) => {
                                const columnId = getColumnId(column);
                                const meta = column.meta as
                                    | TableColumnMeta
                                    | undefined;
                                const sticky =
                                    stickyColumnIds.includes(columnId);
                                const isActions = columnId === actionsColumnId;
                                const isStatus = columnId === "status";
                                const width =
                                    columnSizing[columnId] ??
                                    column.size ??
                                    150;
                                const minWidth = sticky
                                    ? width
                                    : (column.minSize ?? width);
                                const maxWidth = sticky
                                    ? width
                                    : (column.maxSize ?? width);
                                const stickyClass = getStickyClassName(
                                    columnId,
                                    "group/header relative h-full px-4 border-t border-border flex items-center",
                                );
                                const headerClassName = isActions
                                    ? cn(
                                          "group/header relative h-full px-4 border-t border-border flex items-center justify-center md:sticky md:right-0 z-10",
                                          HEADER_BACKGROUND_CLASS,
                                      )
                                    : sticky
                                      ? cn(
                                            stickyClass,
                                            HEADER_BACKGROUND_CLASS,
                                            "z-10",
                                        )
                                      : cn(
                                            stickyClass,
                                            HEADER_BACKGROUND_CLASS,
                                        );

                                return (
                                    <TableHead
                                        key={columnId}
                                        className={headerClassName}
                                        style={{
                                            width,
                                            minWidth,
                                            maxWidth,
                                            ...getStickyStyle(columnId),
                                            ...(!isActions &&
                                                !isStatus && {
                                                    borderRight:
                                                        "1px solid hsl(var(--border))",
                                                }),
                                            ...(isActions && {
                                                borderLeft:
                                                    "1px solid hsl(var(--border))",
                                                borderTop:
                                                    "1px solid hsl(var(--border))",
                                            }),
                                        }}
                                    >
                                        {columnId === "select" ? (
                                            <Skeleton className="h-4 w-4" />
                                        ) : (
                                            <span
                                                className={HEADER_TEXT_CLASS}
                                            >
                                                {getHeaderLabel(column)}
                                            </span>
                                        )}
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>

                    <TableBody className="border-l-0 border-r-0">
                        {rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className="group flex h-[45px] items-center border-b border-border"
                            >
                                {visibleColumns.map((column) => {
                                    const columnId = getColumnId(column);
                                    const meta = column.meta as
                                        | TableColumnMeta
                                        | undefined;
                                    const sticky =
                                        stickyColumnIds.includes(columnId);
                                    const isActions =
                                        columnId === actionsColumnId;
                                    const width =
                                        columnSizing[columnId] ??
                                        column.size ??
                                        150;
                                    const minWidth = sticky
                                        ? width
                                        : (column.minSize ?? width);
                                    const maxWidth = sticky
                                        ? width
                                        : (column.maxSize ?? width);
                                    const cellClassName = cn(
                                        "flex h-full items-center",
                                        getStickyClassName(
                                            columnId,
                                            meta?.className,
                                        ),
                                        isActions &&
                                            "md:sticky md:right-0 bg-background z-10 justify-center",
                                    );

                                    return (
                                        <TableCell
                                            key={columnId}
                                            className={cellClassName}
                                            style={{
                                                width,
                                                minWidth,
                                                maxWidth,
                                                ...getStickyStyle(columnId),
                                                ...(isActions && {
                                                    borderLeft:
                                                        "1px solid hsl(var(--border))",
                                                    borderBottom:
                                                        "1px solid hsl(var(--border))",
                                                }),
                                            }}
                                        >
                                            {meta?.skeleton ? (
                                                <SkeletonCell
                                                    type={meta.skeleton.type}
                                                    width={meta.skeleton.width}
                                                />
                                            ) : (
                                                <Skeleton className="h-3.5 w-24" />
                                            )}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
