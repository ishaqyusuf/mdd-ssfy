"use client";

import { ServerPromiseType } from "@/types";
import { getDispatchSales } from "../action";
import React from "react";
import { useDataTableColumn2 } from "@/components/common/data-table/columns/use-data-table-columns";
import { DataTable2 } from "@/components/_v1/data-table/data-table-2";
import { DispatchCells } from "./cells";

export type DispatchPromiseResponse = ServerPromiseType<
    typeof getDispatchSales
>;

export default function DispatchTable({ promise, params }) {
    const isPickup = params.type == "pickup";
    const { data, pageCount }: DispatchPromiseResponse["Response"] =
        React.use(promise);
    const table = useDataTableColumn2(
        data,
        {
            checkable: true,
            filterCells: ["_q", "_date"],
        },
        (ctx) => [
            ctx.Column("Order", DispatchCells.Order),
            ctx.Column("Shipping Address", DispatchCells.Customer),
            ctx.Column("Production", DispatchCells.ProductionStatus),
            ctx.ActionColumn(DispatchCells.Actions),
            ...(isPickup ? [] : []),
        ]
    );

    return (
        <DataTable2
            columns={table.columns}
            data={data}
            searchParams={[{ id: "_q" as any, title: "" }]}
        ></DataTable2>
    );
}
