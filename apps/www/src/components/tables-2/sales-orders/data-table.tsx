"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSortParams } from "@/hooks/use-sort-params";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useTRPC } from "@/trpc/client";
import { STICKY_COLUMNS } from "@/utils/table-configs";
import { getColumnIds, type TableSettings } from "@/utils/table-settings";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";

import { BottomBar } from "./bottom-bar";
import { columns, type SalesOrder } from "./columns";
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
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>(
        {},
    );

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
        filters,
        {
            getNextPageParam: ({ meta }) =>
                (meta as { cursor?: string | number | null } | undefined)
                    ?.cursor,
        },
    );

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useSuspenseInfiniteQuery(infiniteQueryOptions);

    const tableData = useMemo(() => {
        const rows = data?.pages.flatMap((page) => page?.data ?? []) ?? [];
        const [sortColumn, sortValue] = params.sort?.[0]?.split(".") ?? [];

        if (!sortColumn || !sortValue) return rows;

        return [...rows].sort((a, b) =>
            compareSalesOrders(a, b, sortColumn, sortValue),
        );
    }, [data, params.sort]);

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
                        height: "calc(100vh - 350px)",
                    }}
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
                                        getStickyClassName={getStickyClassName}
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
                </div>
            </div>

            <AnimatePresence>
                {showBottomBar && (
                    <BottomBar
                        selectedCount={Object.keys(rowSelection).length}
                        onDeselect={() => table.resetRowSelection()}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function compareSalesOrders(
    a: SalesOrder,
    b: SalesOrder,
    sortColumn: string,
    sortValue: string,
) {
    const direction = sortValue === "desc" ? -1 : 1;
    const left = getSortValue(a, sortColumn);
    const right = getSortValue(b, sortColumn);

    if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
    }

    return String(left ?? "").localeCompare(String(right ?? "")) * direction;
}

function getSortValue(item: SalesOrder, sortColumn: string) {
    switch (sortColumn) {
        case "grandTotal":
            return item.invoiceTotal;
        case "amountDue":
            return item.amountDue;
        case "createdAt":
            return item.salesDate;
        case "prodStatus":
            return item.productionLabel;
        case "deliveredAt":
            return item.fulfillmentLabel;
        case "salesRepName":
            return item.salesRepName;
        case "customerName":
            return item.customerName;
        case "status":
            return item.statusLabel;
        case "orderId":
        default:
            return item.orderId;
    }
}
