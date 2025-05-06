"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import QueryTab from "@/app/(clean-code)/_common/query-tab";
import { QueryTabAction } from "@/app/(clean-code)/_common/query-tab/query-tab-edit";
import { Icons } from "@/components/_v1/icons";
import {
    DataTable,
    InfiniteDataTablePageProps,
} from "@/components/(clean-code)/data-table";
import { DataTableFilterCommand } from "@/components/(clean-code)/data-table/filter-command";
import {
    BatchBtn,
    BatchDelete,
} from "@/components/(clean-code)/data-table/infinity/batch-action";
import { DataTableInfinityToolbar } from "@/components/(clean-code)/data-table/infinity/data-table-toolbar";
import { useInfiniteDataTable } from "@/components/(clean-code)/data-table/use-data-table";
import { useTableCompose } from "@/components/(clean-code)/data-table/use-table-compose";
import { _modal } from "@/components/common/modal/provider";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { SalesOrdersFitler } from "@/components/tables/sales-orders/search-filter";
import { useSalesEmailSender } from "@/hooks/use-sales-email-sender";
import { useSalesFilterParams } from "@/hooks/use-sales-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { Button } from "@gnd/ui/button";

import { PrintAction } from "../../../_common/_components/overview-sheet.bin/footer/print.action";
import { OrderOverviewSheet } from "../../../_common/_components/overview-sheet.bin/order-overview-sheet";
import { deleteSalesByOrderIds } from "../../../_common/data-actions/sales-actions";
import { __filters } from "../../../_common/utils/contants";
import { OrderCells as Cells } from "./orders-page-cells";

export default function OrdersPageClient({
    filterFields,
    queryKey,
    queryParams,
}: InfiniteDataTablePageProps) {
    // const filters =
    const table = useTableCompose({
        cells(ctx) {
            return [
                ctx.Column("Date", "date", Cells.Date),
                ctx.Column("Order #", "order.no", Cells.Order),
                ctx.Column("P.O", "po", Cells.Po),
                ctx.Column("Customer", "customer", Cells.Customer),
                ctx.Column("Phone", "phone", Cells.CustomerPhone),
                ctx.Column("Address", "address", Cells.Address),
                // ctx.Column("Rep", "rep", Cells.SalesRep),
                ctx.Column("Invoice", "invoice", Cells.Invoice),
                ctx.Column("Pending", "pending", Cells.InvoicePending),
                ctx.Column("Dispatch", "dispatch", Cells.Dispatch),
                ctx.Column("Production", "production", Cells.Production),
                ...__filters().orders.filterColumns,
            ];
        },
        filterFields,
        cellVariants: {
            size: "sm",
        },
        passThroughProps: {
            itemClick(item) {
                // _modal.openSheet();
            },
        },
    });
    const overviewQuery = useSalesOverviewQuery();

    return (
        <div className="bg-white">
            <DataTable.Infinity
                checkable
                itemViewFn={(data) => {
                    overviewQuery.open2(data.uuid, "sales");
                }}
                ActionCell={Cells.Action}
                queryKey={queryKey}
                {...table.props}
            >
                <BatchActions />
                <DataTable.Header top="lg" className="bg-white">
                    <div className="mb-2 flex items-end justify-between gap-2 sm:sticky">
                        <div className="">
                            <QueryTab page="orders" />
                        </div>

                        <div className="flex-1"></div>
                        <QueryTabAction />

                        <Button asChild size="sm">
                            <Link href="/sales-book/create-order">
                                <Icons.add className="mr-2 size-4" />
                                <span>New</span>
                            </Link>
                        </Button>
                    </div>
                    <div className="flex justify-between">
                        <div className="flex-1">
                            {/* <DataTableFilterCommand /> */}
                            <SalesOrdersFitler filterFields={filterFields} />
                        </div>
                        <DataTableInfinityToolbar />
                    </div>
                </DataTable.Header>
                <DataTable.Table />
                <DataTable.LoadMore />
                <OrderOverviewSheet />
            </DataTable.Infinity>
        </div>
    );
}
function BatchActions() {
    const ctx = useInfiniteDataTable();
    const slugs = useMemo(() => {
        const slugs = ctx.selectedRows?.map(
            (r) => (r.original as any)?.orderId,
        );
        return slugs;
    }, [ctx.selectedRows]);
    return (
        <DataTable.BatchAction>
            <BatchBtn
                icon="print"
                menu={
                    <>
                        <PrintAction
                            data={{
                                slugs: slugs,
                                item: {
                                    type: "order",
                                },
                            }}
                        />
                        <PrintAction
                            pdf
                            data={{
                                slugs: slugs,
                                item: {
                                    type: "order",
                                },
                            }}
                        />
                        {/* <Menu.Trash action={() => {}}>
                                    Delete
                                </Menu.Trash> */}
                    </>
                }
            >
                Print
            </BatchBtn>
            <BatchBtn
                icon="Email"
                menu={
                    <>
                        <SalesEmailMenuItem
                            asChild
                            salesType="order"
                            orderNo={slugs}
                        />
                    </>
                }
            >
                Email
            </BatchBtn>
            <BatchDelete
                onClick={async () => {
                    await deleteSalesByOrderIds(slugs);
                }}
            />
        </DataTable.BatchAction>
    );
}
