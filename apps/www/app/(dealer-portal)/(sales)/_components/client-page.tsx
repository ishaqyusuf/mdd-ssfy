"use client";

import PageHeader from "@/components/_v1/page-header";
import { useDataTableColumn2 } from "@/components/common/data-table/columns/use-data-table-columns";

import { GetSales } from "@/data-access/sales";
import { use } from "react";
import { DataTable } from "@/app/_components/data-table";
import { TableToolbar } from "@/app/_components/data-table/toolbar";
import { Cells } from "./cells";

interface Props {
    promise;
    quote?: Boolean;
}

export default function ClientPage({ promise, quote }: Props) {
    const { data, pageCount }: GetSales = use(promise);
    const table = useDataTableColumn2(
        data,
        {
            pageCount,
            checkable: false,
            cellVariants: {
                // size: "sm",
            },
        },
        (ctx) => [
            ctx.Column("Order", Cells.Order),
            ctx.Column("Billing", Cells.Customer),
            ctx.Column("Shipping", Cells.Address),
            ctx.Column("Invoice", Cells.Invoice),
            ctx.Column("Dispatch", Cells.Dispatch),
            ctx.Column("Status", Cells.Status),
            ctx.ActionColumn(Cells.OrderAction),
        ],
    );
    return (
        <>
            <section className="content space-y-4">
                <div className="">
                    <PageHeader
                        newLink={`/sales-form/${quote ? "quote" : "order"}`}
                        title={quote ? "My Quotes" : "My Orders"}
                    />
                </div>
                <DataTable {...table.props}>
                    <TableToolbar>
                        <TableToolbar.Search />
                    </TableToolbar>
                    <DataTable.Table />
                    <DataTable.Footer />
                </DataTable>
            </section>
        </>
    );
}
