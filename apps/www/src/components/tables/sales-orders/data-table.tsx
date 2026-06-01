"use client";

import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTable, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Icons } from "@gnd/ui/icons";
import dynamic from "next/dynamic";
import Link from "next/link";

import { salesPriorityRowClassName } from "@/components/sales-priority-control";
import { salesInboundRowClassName } from "./columns";
import { TableSkeleton } from "../skeleton";
import { columns, mobileColumn } from "./columns";

const BatchActions = dynamic(
    () => import("./batch-actions").then((mod) => mod.BatchActions),
    {
        ssr: false,
    },
);

interface Props {
    defaultFilters?: RouterInputs["sales"]["getOrders"];
    singlePage?: boolean;
    bin?: boolean;
    hideFloatingPagination?: boolean;
}
export function DataTable(props: Props) {
    const trpc = useTRPC();
    const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const {
        filters,
        hasFilters,
        setFilters,
        isPending: isFilterPending,
    } = useOrderFilterParams();
    const {
        data,
        ref: loadMoreRef,
        hasNextPage,
        isFetching,
    } = useTableData({
        filter: {
            ...filters,
            ...(props.defaultFilters || {}),
            bin: props.bin,
        },
        route: trpc.sales.getOrders,
    });
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const overviewQuery = useSalesOverviewQuery();
    // Enable this when you want row clicks to open the new v2 sheet instead.
    // const v2SheetQuery = useSalesOverviewV2SheetQuery();
    // const openSalesOverviewV2Sheet = (rowData) => {
    //     v2SheetQuery.setParams({
    //         overviewSheetId: rowData.uuid,
    //         overviewSheetType: "sales",
    //         overviewSheetMode: "sales",
    //         overviewSheetTab: "overview",
    //     });
    // };
    if (isFilterPending) {
        return <TableSkeleton />;
    }

    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilters} />;
    }

    if (!data?.length && !isFetching) {
        return (
            <EmptyState
                CreateButton={
                    <Button asChild size="sm">
                        <Link href="/sales-book/create-order">
                            <Icons.add className="mr-2 size-4" />
                            <span>New</span>
                        </Link>
                    </Button>
                }
            />
        );
    }
    return (
        <Table.Provider
            args={[
                {
                    columns,
                    mobileColumn,
                    data,
                    checkbox: true,
                    tableScroll,
                    rowSelection,

                    props: {
                        hasNextPage,
                        loadMoreRef: props.singlePage ? null : loadMoreRef,
                    },
                    setRowSelection,
                    tableMeta: {
                        hidePagination: props.hideFloatingPagination,
                        mobileMode: {
                            hideHeader: true,
                            borderless: true,
                        },
                        rowClassName(row) {
                            return [
                                salesPriorityRowClassName(
                                    row.original?.priority,
                                ),
                                salesInboundRowClassName(
                                    row.original?.inboundStatus,
                                ),
                            ]
                                .filter(Boolean)
                                .join(" ");
                        },
                        rowClick(id, rowData) {
                            overviewQuery.open2(rowData.uuid, "sales");
                            // openSalesAdminSheet(rowData.uuid)
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4 w-full">
                <Table.SummaryHeader />
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
                <BatchActionsGate />
            </div>
        </Table.Provider>
    );
}

function BatchActionsGate() {
    const table = useTable();

    return table.selectedRows?.length ? <BatchActions /> : null;
}
