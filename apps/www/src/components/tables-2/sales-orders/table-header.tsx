"use client";

import {
    ACTIONS_FULL_WIDTH_HEADER_CLASS,
    ACTIONS_STICKY_HEADER_CLASS,
    type TableColumnMeta,
    type TableScrollState,
    getHeaderLabel,
} from "@/components/tables-2/core";
import { DraggableHeader } from "@/components/tables-2/draggable-header";
import { ResizeHandle } from "@/components/tables-2/resize-handle";
import { HorizontalPagination } from "@/components/horizontal-pagination";
import { useSortQuery } from "@/hooks/use-sort-query";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import {
    NON_REORDERABLE_COLUMNS,
    SORT_FIELD_MAPS,
    STICKY_COLUMNS,
} from "@/utils/table-configs";
import {
    horizontalListSortingStrategy,
    SortableContext,
} from "@dnd-kit/sortable";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { TableHead, TableHeader, TableRow } from "@gnd/ui/table";
import type { Header, Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";

interface Props<TData> {
    table?: Table<TData>;
    loading?: boolean;
    tableScroll?: TableScrollState;
    showColumnDividers?: boolean;
}
const HEADER_BACKGROUND_CLASS = "!bg-sidebar-accent";
const HEADER_TEXT_CLASS =
    "text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300";
const HEADER_CELL_BACKGROUND_STYLE = {
    backgroundColor:
        "color-mix(in oklab, var(--sidebar-accent) 88%, var(--foreground))",
};

export function DataTableHeader<TData>({
    table,
    loading,
    tableScroll,
    showColumnDividers = false,
}: Props<TData>) {
    const { sortColumn, sortValue, createSortQuery } = useSortQuery();
    const { getStickyStyle, getStickyClassName, isVisible } = useStickyColumns({
        table,
        loading,
        stickyColumns: STICKY_COLUMNS["sales-orders"],
    });
    const sortableColumnIds = useMemo(() => {
        if (!table) return [];

        return table
            .getAllLeafColumns()
            .filter(
                (column) =>
                    !NON_REORDERABLE_COLUMNS["sales-orders"].has(column.id),
            )
            .map((column) => column.id);
    }, [table]);

    if (!table) return null;

    return (
        <TableHeader
            className={cn(
                "sticky top-0 z-20 block w-full border-0",
                HEADER_BACKGROUND_CLASS,
            )}
        >
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                    key={headerGroup.id}
                    className="flex h-[45px] min-w-full items-center !border-b-0 hover:bg-transparent"
                >
                    <SortableContext
                        items={sortableColumnIds}
                        strategy={horizontalListSortingStrategy}
                    >
                        {headerGroup.headers.map(
                            (header, headerIndex, headers) => {
                                const columnId = header.column.id;
                                const meta = header.column.columnDef.meta as
                                    | TableColumnMeta
                                    | undefined;
                                const isSticky = meta?.sticky ?? false;
                                const isActions = columnId === "actions";
                                const canReorder =
                                    !NON_REORDERABLE_COLUMNS[
                                        "sales-orders"
                                    ].has(columnId);

                                if (!isVisible(columnId)) return null;

                                const nextVisibleHeader = headers
                                    .slice(headerIndex + 1)
                                    .find((item) => isVisible(item.column.id));
                                const showRightDivider =
                                    showColumnDividers &&
                                    Boolean(nextVisibleHeader) &&
                                    nextVisibleHeader?.column.id !== "actions";

                                const hasNonStickyVisible = headers.some(
                                    (item) => {
                                        if (item.column.id === "actions")
                                            return false;
                                        if (!isVisible(item.column.id))
                                            return false;

                                        const itemMeta = item.column.columnDef
                                            .meta as
                                            | TableColumnMeta
                                            | undefined;

                                        return !(itemMeta?.sticky ?? false);
                                    },
                                );
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
                                    ...HEADER_CELL_BACKGROUND_STYLE,
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
                                    ...(!actionsFullWidth &&
                                        getStickyStyle(columnId)),
                                    ...(shouldFlex && { flex: 1 }),
                                };

                                if (!canReorder) {
                                    const stickyClass = getStickyClassName(
                                        columnId,
                                        cn(
                                            "group/header relative h-full px-4 border-t border-border flex items-center",
                                            showRightDivider && "border-r",
                                        ),
                                    );
                                    const finalClassName = isActions
                                        ? actionsFullWidth
                                            ? cn(
                                                  ACTIONS_FULL_WIDTH_HEADER_CLASS,
                                                  HEADER_BACKGROUND_CLASS,
                                                  showRightDivider &&
                                                      "border-r",
                                              )
                                            : cn(
                                                  ACTIONS_STICKY_HEADER_CLASS,
                                                  HEADER_BACKGROUND_CLASS,
                                                  showRightDivider &&
                                                      "border-r",
                                              )
                                        : cn(
                                              stickyClass,
                                              HEADER_BACKGROUND_CLASS,
                                              "z-10",
                                          );

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
                                            <ResizeHandle header={header} />
                                        </TableHead>
                                    );
                                }

                                return (
                                    <DraggableHeader
                                        key={header.id}
                                        id={columnId}
                                        style={headerStyle}
                                        className={cn(
                                            HEADER_BACKGROUND_CLASS,
                                            showRightDivider && "border-r",
                                        )}
                                    >
                                        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                                            {renderHeaderContent(
                                                header,
                                                columnId,
                                                sortColumn,
                                                sortValue,
                                                createSortQuery,
                                                table,
                                                tableScroll,
                                            )}
                                        </div>
                                        <ResizeHandle header={header} />
                                    </DraggableHeader>
                                );
                            },
                        )}
                    </SortableContext>
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
    const isRightAligned = meta?.className?.split(/\s+/).includes("text-right");

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
            <span className={cn("w-full text-center", HEADER_TEXT_CLASS)}>
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
                    <HorizontalPagination
                        canScrollLeft={tableScroll.canScrollLeft}
                        canScrollRight={tableScroll.canScrollRight}
                        onScrollLeft={tableScroll.scrollLeft}
                        onScrollRight={tableScroll.scrollRight}
                        className="hidden shrink-0 md:flex"
                    />
                )}
            </div>
        );
    }

    if (sortField) {
        return (
            <div
                className={
                    isRightAligned
                        ? "flex w-full justify-end overflow-hidden"
                        : "w-full overflow-hidden"
                }
            >
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
        <span
            className={cn(
                HEADER_TEXT_CLASS,
                isRightAligned
                    ? "block w-full truncate text-right"
                    : "truncate",
            )}
        >
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
            className={cn(
                "min-w-0 max-w-full gap-2 p-0 hover:bg-transparent",
                HEADER_TEXT_CLASS,
                "hover:text-slate-900 dark:hover:text-slate-100",
            )}
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
