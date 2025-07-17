"use client";

import Link from "@/components/link";

import { Icons } from "@/components/_v1/icons";
import { DataTable } from "@/components/(clean-code)/data-table";
import { DataTableFilterCommand } from "@/components/(clean-code)/data-table/filter-command";
import { DataTableInfinityToolbar } from "@/components/(clean-code)/data-table/infinity/data-table-toolbar";
import { useTableCompose } from "@/components/(clean-code)/data-table/use-table-compose";
import { _modal } from "@/components/common/modal/provider";
import { isProdClient } from "@/lib/is-prod";

import { Button } from "@gnd/ui/button";

import { openQuoteOVerview } from "../../../_common/_components/sales-overview-sheet.bin";
import { __filters } from "../../../_common/utils/contants";
import { QuotesCell } from "./quotes-page-cells";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import {
    BatchBtn,
    BatchDelete,
} from "@/components/(clean-code)/data-table/infinity/batch-action";
import { useInfiniteDataTable } from "@/components/(clean-code)/data-table/use-data-table";
import { useMemo } from "react";
import { PrintAction } from "../../../_common/_components/overview-sheet.bin/footer/print.action";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { deleteSalesByOrderIds } from "../../../_common/data-actions/sales-actions";

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

    const overviewQuery = useSalesOverviewQuery();
    return (
        <div>
            <DataTable.Infinity
                queryKey={queryKey}
                {...table.props}
                ActionCell={QuotesCell.Action}
                itemViewFn={(data) => {
                    overviewQuery.open2(data.uuid, "quote");
                }}
            >
                <DataTable.Header className="bg-white">
                    <div className="mb-2 flex items-end justify-between gap-2 sm:sticky">
                        <div className=""></div>
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
                                    type: "quote",
                                },
                            }}
                        />
                        <PrintAction
                            pdf
                            data={{
                                slugs: slugs,
                                item: {
                                    type: "quote",
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
                            salesType="quote"
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
