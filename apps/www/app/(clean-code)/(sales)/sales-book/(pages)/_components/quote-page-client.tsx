"use client";

import Link from "next/link";
import QueryTab from "@/app/(clean-code)/_common/query-tab";
import { QueryTabAction } from "@/app/(clean-code)/_common/query-tab/query-tab-edit";
import { Icons } from "@/components/_v1/icons";
import { DataTable } from "@/components/(clean-code)/data-table";
import { DataTableFilterCommand } from "@/components/(clean-code)/data-table/filter-command";
import { DataTableInfinityToolbar } from "@/components/(clean-code)/data-table/infinity/data-table-toolbar";
import { useTableCompose } from "@/components/(clean-code)/data-table/use-table-compose";
import { _modal } from "@/components/common/modal/provider";
import { isProdClient } from "@/lib/is-prod";

import { Button } from "@gnd/ui/button";

import { OrderOverviewSheet } from "../../../_common/_components/overview-sheet.bin/order-overview-sheet";
import { openQuoteOVerview } from "../../../_common/_components/sales-overview-sheet.bin";
import { __filters } from "../../../_common/utils/contants";
import { QuotesCell } from "./quotes-page-cells";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";

interface Props {
    // promise;
    filterFields;
    searchParams;
    queryKey;
}
export default function QuotesPageClient({ filterFields, queryKey }: Props) {
    const table = useTableCompose({
        cells(ctx) {
            return [
                ctx.Column("Date", "date", QuotesCell.Date),
                ctx.Column("Order #", "orderId", QuotesCell.Order),
                ctx.Column("P.O", "po", QuotesCell.Po),
                ctx.Column("Customer", "customer", QuotesCell.Customer),
                ctx.Column("Phone", "phone", QuotesCell.CustomerPhone),
                ctx.Column("Address", "address", QuotesCell.Address),
                ctx.Column("Rep", "rep", QuotesCell.SalesRep),
                ctx.Column("Invoice", "invoice", QuotesCell.Invoice),
            ];
        },
        checkable: true,
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
    return (
        <div>
            <DataTable.Infinity
                queryKey={queryKey}
                {...table.props}
                ActionCell={QuotesCell.Action}
                itemViewFn={
                    isProdClient
                        ? (data) => {
                              openQuoteOVerview({
                                  salesId: data.id,
                              });
                          }
                        : undefined
                }
            >
                <DataTable.Header top="lg" className="bg-white">
                    <div className="mb-2 flex items-end justify-between gap-2 sm:sticky">
                        <div className="">
                            <QueryTab page="quotes" />
                        </div>
                        <div className="flex-1"></div>
                        <QueryTabAction />
                        <Button asChild size="sm">
                            <Link href="/sales-book/create-quote">
                                <Icons.add className="mr-2 size-4" />
                                <span>New</span>
                            </Link>
                        </Button>
                    </div>
                    <div className="flex justify-between">
                        {/* <div className="w-1/2">
                            <DataTableFilterCommand />
                        </div> */}
                        <div className="flex-1">
                            <MiddaySearchFilter
                                placeholder={"Search quote information"}
                                filterList={filterFields}
                            />
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
