"use client";

import { _trpc } from "@/components/static-trpc";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOrdersStore } from "@/store/sales-orders";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";

import { TableSkeleton } from "../skeleton";
import { BatchActions } from "./batch-actions";
import { columns, mobileColumn } from "./columns";

interface Props {
    defaultFilters?: RouterInputs["sales"]["getOrders"];
    singlePage?: boolean;
    bin?: boolean;
}
export function DataTable(props: Props) {
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
                            <Icons.Add className="mr-2 size-4" />
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
                        mobileMode: {
                            hideHeader: true,
                            borderless: true,
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
                <BatchActions />
            </div>
        </Table.Provider>
    );
}

