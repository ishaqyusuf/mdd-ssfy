"use client";

import { useTRPC } from "@/trpc/client";
import {
    createTableContext,
    Table,
    useTableData,
} from "@gnd/ui/custom/data-table/index";
import { columns } from "./columns";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { BatchActions } from "./batch-actions";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOrdersStore } from "@/store/sales-orders";

export function DataTable() {
    const trpc = useTRPC();
    const { filters } = useOrderFilterParams();
    const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const {
        data,
        ref: loadMoreRef,
        hasNextPage,
        isFetching,
    } = useTableData({
        filter: {
            ...filters,
        },
        route: trpc.sales.quotes,
    });

    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const overviewQuery = useSalesOverviewQuery();
    return (
        <Table.Provider
            value={createTableContext({
                columns,
                // mobileColumn: mobileColumn,
                data,
                checkbox: true,
                tableScroll,
                // rowSelection,
                props: {
                    hasNextPage,
                    loadMoreRef,
                },
                // setRowSelection,
                tableMeta: {
                    rowClick(id, rowData) {
                        overviewQuery.open2(rowData.uuid, "quote");
                    },
                },
            })}
        >
            <div className="flex flex-col gap-4 w-full">
                <div
                    ref={tableScroll.containerRef}
                    className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
                >
                    <Table>
                        <Table.TableHeader />
                        <Table.Body>
                            <Table.TableRow />
                        </Table.Body>
                    </Table>
                </div>
                <Table.LoadMore />
                <BatchActions />
            </div>
        </Table.Provider>
    );
}

