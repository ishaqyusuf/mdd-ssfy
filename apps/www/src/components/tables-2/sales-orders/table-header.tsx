"use client";

import {
    ACTIONS_FULL_WIDTH_HEADER_CLASS,
    ACTIONS_STICKY_HEADER_CLASS,
    type TableColumnMeta,
    type TableScrollState,
    getHeaderLabel,
} from "@/components/tables-2/core";
import { useSortQuery } from "@/hooks/use-sort-query";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { SORT_FIELD_MAPS, STICKY_COLUMNS } from "@/utils/table-configs";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import { TableHead, TableHeader, TableRow } from "@gnd/ui/table";
import type { Header, Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";

interface Props<TData> {
    table?: Table<TData>;
    loading?: boolean;
    tableScroll?: TableScrollState;
}

export function DataTableHeader<TData>({
    table,
    loading,
    tableScroll,
}: Props<TData>) {
    const { sortColumn, sortValue, createSortQuery } = useSortQuery();
    const { getStickyStyle, getStickyClassName, isVisible } = useStickyColumns({
        table,
        loading,
        stickyColumns: STICKY_COLUMNS["sales-orders"],
    });

    if (!table) return null;

    return (
        <TableHeader className="sticky top-0 z-20 block w-full border-0 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                    key={headerGroup.id}
                    className="flex h-[45px] min-w-full items-center !border-b-0 hover:bg-transparent"
                >
                    {headerGroup.headers.map((header, headerIndex, headers) => {
                        const columnId = header.column.id;
                        const meta = header.column.columnDef.meta as
                            | TableColumnMeta
                            | undefined;
                        const isSticky = meta?.sticky ?? false;
                        const isActions = columnId === "actions";

                        if (!isVisible(columnId)) return null;

                        const hasNonStickyVisible = headers.some((item) => {
                            if (item.column.id === "actions") return false;
                            if (!isVisible(item.column.id)) return false;

                            const itemMeta = item.column.columnDef.meta as
                                | TableColumnMeta
                                | undefined;

                            return !(itemMeta?.sticky ?? false);
                        });
                        const actionsFullWidth =
                            isActions && !hasNonStickyVisible;
                        const isLastBeforeActions =
                            headerIndex === headers.length - 2 &&
                            headers[headers.length - 1]?.column.id ===
                                "actions";
                        const shouldFlex =
                            (isLastBeforeActions && !isSticky) ||
                            actionsFullWidth;

                        const headerStyle = {
                            width: actionsFullWidth
                                ? undefined
                                : header.getSize(),
                            minWidth: actionsFullWidth
                                ? undefined
                                : isSticky
                                  ? header.getSize()
                                  : header.column.columnDef.minSize,
                            maxWidth: actionsFullWidth
                                ? undefined
                                : isSticky
                                  ? header.getSize()
                                  : header.column.columnDef.maxSize,
                            ...(!actionsFullWidth && getStickyStyle(columnId)),
                            ...(shouldFlex && { flex: 1 }),
                        };

                        const stickyClass = getStickyClassName(
                            columnId,
                            "group/header relative h-full px-4 border-t border-border flex items-center",
                        );
                        const finalClassName = isActions
                            ? actionsFullWidth
                                ? ACTIONS_FULL_WIDTH_HEADER_CLASS
                                : ACTIONS_STICKY_HEADER_CLASS
                            : `${stickyClass} bg-background z-10`;

                        return (
                            <TableHead
                                key={header.id}
                                className={finalClassName}
                                style={headerStyle}
                            >
                                {renderHeaderContent(
                                    header,
                                    columnId,
                                    sortColumn,
                                    sortValue,
                                    createSortQuery,
                                    table,
                                    tableScroll,
                                )}
                                {header.column.getCanResize() && (
                                    <div
                                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none bg-transparent hover:bg-border"
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                    />
                                )}
                            </TableHead>
                        );
                    })}
                </TableRow>
            ))}
        </TableHeader>
    );
}

function renderHeaderContent<TData>(
    header: Header<TData, unknown>,
    columnId: string,
    sortColumn: string | undefined,
    sortValue: string | undefined,
    createSortQuery: (name: string) => void,
    table: Table<TData>,
    tableScroll?: TableScrollState,
) {
    const meta = header.column.columnDef.meta as TableColumnMeta | undefined;
    const sortField =
        meta?.sortField ?? SORT_FIELD_MAPS["sales-orders"][columnId];

    if (columnId === "select") {
        return (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected()
                        ? true
                        : table.getIsSomePageRowsSelected()
                          ? "indeterminate"
                          : false
                }
                onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                }
            />
        );
    }

    if (columnId === "actions") {
        return (
            <span className="w-full text-center text-muted-foreground">
                Actions
            </span>
        );
    }

    if (columnId === "orderId") {
        return (
            <div className="flex w-full items-center justify-between overflow-hidden">
                <SortButton
                    label={
                        meta?.headerLabel ??
                        getHeaderLabel(header.column.columnDef)
                    }
                    sortField={sortField ?? "orderId"}
                    currentSortColumn={sortColumn}
                    currentSortValue={sortValue}
                    onSort={createSortQuery}
                />
                {tableScroll?.isScrollable && (
                    <div className="hidden shrink-0 items-center gap-1 md:flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={!tableScroll.canScrollLeft}
                            onClick={(event) => {
                                event.stopPropagation();
                                tableScroll.scrollLeft();
                            }}
                        >
                            <Icons.ChevronLeft className="size-3.5" />
                            <span className="sr-only">Scroll left</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={!tableScroll.canScrollRight}
                            onClick={(event) => {
                                event.stopPropagation();
                                tableScroll.scrollRight();
                            }}
                        >
                            <Icons.ChevronRight className="size-3.5" />
                            <span className="sr-only">Scroll right</span>
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    if (sortField) {
        return (
            <div className="w-full overflow-hidden">
                <SortButton
                    label={
                        meta?.headerLabel ??
                        getHeaderLabel(header.column.columnDef)
                    }
                    sortField={sortField}
                    currentSortColumn={sortColumn}
                    currentSortValue={sortValue}
                    onSort={createSortQuery}
                />
            </div>
        );
    }

    return (
        <span className="truncate text-muted-foreground">
            {meta?.headerLabel ?? getHeaderLabel(header.column.columnDef)}
        </span>
    );
}

function SortButton({
    label,
    sortField,
    currentSortColumn,
    currentSortValue,
    onSort,
}: {
    label: string;
    sortField: string;
    currentSortColumn?: string;
    currentSortValue?: string;
    onSort: (field: string) => void;
}) {
    return (
        <Button
            className="min-w-0 max-w-full gap-2 p-0 hover:bg-transparent"
            variant="ghost"
            onClick={(event) => {
                event.stopPropagation();
                onSort(sortField);
            }}
        >
            <span className="truncate">{label}</span>
            {sortField === currentSortColumn && currentSortValue === "asc" && (
                <ArrowDown size={16} />
            )}
            {sortField === currentSortColumn && currentSortValue === "desc" && (
                <ArrowUp size={16} />
            )}
        </Button>
    );
}

export { DataTableHeader as TableHeader };
