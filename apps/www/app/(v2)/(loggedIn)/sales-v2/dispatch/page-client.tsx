"use client";

import { FPageTabs } from "@/components/(clean-code)/fikr-ui/f-page-tabs";
import { use } from "react";
import { GetDispatchSalesAction } from "./_actions/get-dispatchs";
import { useDataTableColumn2 } from "@/components/common/data-table/columns/use-data-table-columns";
import { DataTable } from "@/app/_components/data-table";
import { TableToolbar } from "@/app/_components/data-table/toolbar";
import { Cells } from "./_components/dispatch-cells";

interface Props {
    response;
}
export default function DispatchPageClient({ response }: Props) {
    const { data, pageCount }: GetDispatchSalesAction = use(response);
    const table = useDataTableColumn2(
        data,
        {
            pageCount,
            checkable: false,
            cellVariants: {
                size: "sm",
            },
        },
        (ctx) => [
            ctx.Column("Order", Cells.Order),
            ctx.Column("Dispatch Type", Cells.DispatchType),
            ctx.Column("Shipping Address", Cells.Customer),
            ctx.Column("Production", Cells.ProductionStatus),
            ctx.Column("Delivery", Cells.DeliveryStatus),
            ctx.ActionColumn(Cells.Actions),
        ],
    );
    return (
        <>
            <FPageTabs>
                <FPageTabs.Tab>All Dispatch</FPageTabs.Tab>
                <FPageTabs.Tab qk="_type" qv="delivery">
                    Delivery
                </FPageTabs.Tab>
                <FPageTabs.Tab qk="_type" qv="pickup">
                    Pickup
                </FPageTabs.Tab>
            </FPageTabs>
            <section className="content">
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
