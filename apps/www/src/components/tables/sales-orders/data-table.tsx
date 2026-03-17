"use client";

import { Table, useTableData } from "@gnd/ui/data-table";
import { columns } from "./columns";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { BatchActions } from "./batch-actions";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { _trpc } from "@/components/static-trpc";
import { RouterInputs } from "@api/trpc/routers/_app";
import { useSalesOverviewV2SheetQuery } from "@/hooks/use-sales-overview-v2-sheet-query";

interface Props {
    defaultFilters?: RouterInputs["sales"]["getOrders"];
    singlePage?: boolean;
    bin?: boolean;
}
export function DataTable(props: Props) {
    const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters, hasFilters, setFilters } = useOrderFilterParams();
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
        route: _trpc.sales.getOrders,
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
    //         "sales-overview-v2-sheet-id": rowData.uuid,
    //         "sales-overview-v2-sheet-type": "sales",
    //         "sales-overview-v2-sheet-mode": "sales",
    //         "sales-overview-v2-sheet-tab": "general",
    //     });
    // };
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
                    // mobileColumn: mobileColumn,
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
                        rowClick(id, rowData) {
                            overviewQuery.open2(rowData.uuid, "sales");
                            // openSalesOverviewV2Sheet(rowData);
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
                <BatchActions />
            </div>
        </Table.Provider>
    );
}

