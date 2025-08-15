"use client";

import { useTRPC } from "@/trpc/client";
import { TableProvider, useTableData } from "..";
import { columns } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";
import { BatchActions } from "./batch-actions";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useInventoryFilterParams } from "@/hooks/use-inventory-filter-params";

export function DataTable() {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters } = useInventoryFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter: filters,
        route: trpc.inventories.inventoryProducts,
    });

    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });

    return (
        <TableProvider
            args={[
                {
                    columns,
                    // mobileColumn: mobileColumn,
                    data,
                    checkbox: true,
                    tableScroll,
                    // rowSelection,
                    // setRowSelection,
                    tableMeta: {
                        rowClick(id, rowData) {},
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

