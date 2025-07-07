"use client";

import { ServerPromiseType } from "@/types";
import { DeliveryOption } from "@/types/sales";
import { getDispatchSales } from "../_actions/get-dispatch-sales";
import React from "react";
import useDataTableColumn from "@/components/common/data-table/columns/use-data-table-columns";
import { DataTable2 } from "@/components/_v1/data-table/data-table-2";
import { DispatchColumns } from "../_components/dispatch-cells";

export type DispatchProm = ServerPromiseType<typeof getDispatchSales>;
interface Props {
    type: DeliveryOption;
    promise: DispatchProm["Promise"];
}

export default function DispatchTableShell({ promise, type }: Props) {
    const { data, pageCount } = React.use(promise);
    const isPickup = type == "pickup";

    const table = useDataTableColumn(
        data,
        (ctx) => [
            ctx.Column("Order", DispatchColumns.Order),
            ctx.Column("Approved By", DispatchColumns.ApprovedBy),
            ctx.Column(
                isPickup ? "Pickup By" : "Delivered To",
                DispatchColumns.Recipient
            ),
        ],
        true,
        {
            sn: true,
            // snIdFn(item) {
            //     return item.order.orderId;
            // },
            filterCells: ["_q", "_date"],
        }
    );
    return (
        <>
            <DataTable2
                columns={table.columns}
                data={data}
                pageCount={pageCount}
            />
        </>
    );
}
