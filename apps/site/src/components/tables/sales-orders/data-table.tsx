"use client";

import { useTRPC } from "@/trpc/client";
import { TableProvider, useTableData } from "..";
import { columns, mobileColumn } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";
import { useSalesPreview } from "@/hooks/use-sales-preview";

import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { BatchActions } from "./batch-actions";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOrdersStore } from "@/store/sales-orders";

export function DataTable() {
    const trpc = useTRPC();
    const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters } = useOrderFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter: filters,
        route: trpc.sales.index,
    });
    const { setParams: setSalesPreviewParams } = useSalesPreview();
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const overviewQuery = useSalesOverviewQuery();
    return (
        <TableProvider
            args={[
                {
                    columns,
                    mobileColumn: mobileColumn,
                    data,
                    checkbox: true,
                    tableScroll,
                    rowSelection,
                    setRowSelection,
                    tableMeta: {
                        rowClick(id, rowData) {
                            overviewQuery.open2(rowData.uuid, "sales");
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4 w-full">
                <div
                    ref={tableScroll.containerRef}
                    className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
                >
                    <Table>
                        <TableHeaderComponent />
                        <TableBody>
                            <TableRow />
                        </TableBody>
                    </Table>
                </div>
                {hasNextPage && (
                    <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />
                )}
                <BatchActions />
            </div>
        </TableProvider>
    );
}

