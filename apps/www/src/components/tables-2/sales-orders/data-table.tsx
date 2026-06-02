"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSortParams } from "@/hooks/use-sort-params";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { STICKY_COLUMNS, SUMMARY_GRID_HEIGHTS } from "@/utils/table-configs";
import { getColumnIds, type TableSettings } from "@/utils/table-settings";
import { closestCenter, DndContext } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { BottomBar } from "./bottom-bar";
import { columns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const COLUMN_IDS = getColumnIds(columns);
const ROW_HEIGHT = 57;

type Props = {
    initialSettings?: Partial<TableSettings>;
};

export function DataTable({ initialSettings }: Props) {
    const trpc = useTRPC();
    const { params } = useSortParams();
    const { filters, hasFilters } = useSalesOrdersV2FilterParams();
    const overviewQuery = useSalesOverviewQuery();
    const parentRef = useRef<HTMLDivElement>(null);
    const { rowSelection, setRowSelection, setColumns } = useSalesOrdersStore();

    useScrollHeader(parentRef, {
        extraOffset: SUMMARY_GRID_HEIGHTS["sales-orders"],
    });

    const {
        columnVisibility,
        setColumnVisibility,
        columnSizing,
        setColumnSizing,
        columnOrder,
        setColumnOrder,
    } = useTableSettings({
        tableId: "sales-orders",
        initialSettings,
        columnIds: COLUMN_IDS,
    });

    const infiniteQueryOptions = trpc.sales.getOrdersV2.infiniteQueryOptions(
        {
            ...filters,
            sort: params.sort,
        },
        {
            getNextPageParam: ({ meta }) =>
                (meta as { cursor?: string | number | null } | undefined)
                    ?.cursor,
        },
    );

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useSuspenseInfiniteQuery(infiniteQueryOptions);

    const tableData = useMemo(() => {
        return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
    }, [data]);

    const table = useReactTable({
        data: tableData,
        getRowId: (row) => row.uuid,
        columns,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        enableColumnResizing: true,
        columnResizeMode: "onChange",
        onColumnSizingChange: setColumnSizing,
        onColumnOrderChange: setColumnOrder,
        state: {
            columnVisibility,
            columnSizing,
            columnOrder,
            rowSelection,
        },
    });

    const { getStickyStyle, getStickyClassName } = useStickyColumns({
        columnVisibility,
        table,
        stickyColumns: STICKY_COLUMNS["sales-orders"],
    });
    const { sensors, handleDragEnd } = useTableDnd(table);
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const rows = table.getRowModel().rows;
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    useEffect(() => {
        setColumns(table.getAllLeafColumns());
    }, [columnVisibility, setColumns, table]);

    useInfiniteScroll<HTMLDivElement>({
        scrollRef: parentRef,
        rowVirtualizer,
        rowCount: rows.length,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    });

    const handleCellClick = useCallback(
        (rowId: string) => {
            overviewQuery.open2(rowId, "sales");
        },
        [overviewQuery],
    );

    const showBottomBar = Object.keys(rowSelection).length > 0;

    if (hasFilters && tableData.length === 0) {
        return <NoResults />;
    }

    if (tableData.length === 0) {
        return <EmptyState />;
    }

    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className="relative">
            <div className="w-full">
                <div
                    ref={(element) => {
                        parentRef.current = element;
                        tableScroll.containerRef.current = element;
                    }}
                    className="overflow-auto overscroll-contain border-b border-l border-r border-border scrollbar-hide"
                    style={{
                        height: "calc(100vh - 350px + var(--header-offset, 0px))",
                    }}
                >
                    <DndContext
                        id="sales-orders-table-dnd"
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <Table className="w-full min-w-full">
                            <DataTableHeader
                                table={table}
                                tableScroll={tableScroll}
                            />

                            <TableBody
                                className="block border-l-0 border-r-0"
                                style={{
                                    height: `${rowVirtualizer.getTotalSize()}px`,
                                    position: "relative",
                                }}
                            >
                                {virtualItems.map((virtualRow: VirtualItem) => {
                                    const row = rows[virtualRow.index];
                                    if (!row) return null;

                                    return (
                                        <VirtualRow
                                            key={row.id}
                                            row={row}
                                            virtualStart={virtualRow.start}
                                            rowHeight={ROW_HEIGHT}
                                            getStickyStyle={getStickyStyle}
                                            getStickyClassName={
                                                getStickyClassName
                                            }
                                            nonClickableColumns={
                                                NON_CLICKABLE_COLUMNS
                                            }
                                            onCellClick={handleCellClick}
                                            columnSizing={columnSizing}
                                            columnOrder={columnOrder}
                                            columnVisibility={columnVisibility}
                                            isSelected={
                                                rowSelection[row.id] ?? false
                                            }
                                        />
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </DndContext>
                    <div
                        style={{
                            height: "var(--header-offset, 0px)",
                            flexShrink: 0,
                        }}
                        aria-hidden
                    />
                </div>
            </div>

            <AnimatePresence>
                {showBottomBar && <BottomBar data={tableData} />}
            </AnimatePresence>
        </div>
    );
}

