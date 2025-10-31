"use client";

import { ServerPromiseType } from "@/types";
import React from "react";
import useDataTableColumn from "@/components/common/data-table/columns/use-data-table-columns";
import { DataTable2 } from "@/components/_v1/data-table/data-table-2";
import { _getDykeDoors } from "../../_actions/dyke-doors";
import { DoorCells } from "./door-table-cells";

export type DykeDoorTablePromiseProps = ServerPromiseType<typeof _getDykeDoors>;
interface Props {
    promise: DykeDoorTablePromiseProps["Promise"];
}
export default function DykeDoorsTable({ promise }: Props) {
    const { data, pageCount } = React.use(promise);
    const table = useDataTableColumn(
        data,
        (ctx) => [
            ctx.Column("Door", DoorCells.Door),
            // ctx.Column("Order", PayableCells.Order),
            // ctx.Column("Invoice", PayableCells.Invoice),
            // ctx.Column("Due Date", PayableCells.DueDate),
            // ctx.ActionColumn(PayableCells.Options),
        ],
        true,
        { sn: true, filterCells: ["_q", "_date", "_dateType"] }
    );
    return (
        <div>
            <DataTable2
                columns={table.columns}
                data={data}
                pageCount={pageCount}
                dateFilterColumns={[]}
                searchableColumns={[{ id: "_q" as any, title: "payables" }]}
            />
        </div>
    );
}
