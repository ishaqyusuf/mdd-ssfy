"use client";

import { ServerPromiseType } from "@/types";
import React, { useEffect } from "react";
import { _getProductionList } from "../actions";
import useDataTableColumn from "@/components/common/data-table/columns/use-data-table-columns";
import { DataTable2 } from "@/components/_v1/data-table/data-table-2";
import { ProductionCells } from "./sales-prod-cells";
import { Icons } from "@/components/_v1/icons";

interface Props {
    promise;
    prod?: boolean;
    simple?: boolean;
    emptyText?: string;
}
type DataServerPromiseType = ServerPromiseType<typeof _getProductionList>;
export type ProductionListItemType = DataServerPromiseType["Item"];
export default function ProductionList({
    promise,
    emptyText,
    prod,
    simple,
}: Props) {
    const { data, pageCount }: DataServerPromiseType["Response"] =
        React.use(promise);
    // useEffect(() => {}, [data]);
    const table = useDataTableColumn(
        data,
        (ctx) => [
            ctx.Column("Order", ProductionCells.Order),
            ctx.Column("Sales Rep", ProductionCells.SalesRep),
            ctx.Column("Due Date", ProductionCells.DueDate),
            ctx.Column("Status", ProductionCells.ProductionStatus),
            ...(prod
                ? [ctx.ActionColumn(ProductionCells.ProdActions)]
                : [
                      ctx.Column("Assigned To", ProductionCells.AssignedTo),
                      ctx.ActionColumn(ProductionCells.Actions),
                  ]),
        ],
        true,
        {
            filterCells: ["_q", "_date"],
        }
    );
    if (simple && emptyText && !data.length)
        return (
            <div className="rounded-lg rounded-l-none shadow border-l-2 border-l-emerald-700 bg-emerald-100 p-2 px-4 text-emerald-600 flex space-x-4 font-semibold">
                <span className="bg-emerald-700 rounded-full w-6 h-6 flex justify-center items-center">
                    <Icons.check className="size-4 text-white" />
                </span>
                <span>{emptyText}</span>
            </div>
        );
    return (
        <div>
            <DataTable2
                columns={table.columns}
                data={data}
                searchableColumns={[
                    {
                        id: "_q" as any,
                        title: "products",
                    },
                ]}
                filterableColumns={[
                    {
                        id: "status",
                        title: "Status",
                        single: true,
                        options: [
                            { label: "Started", value: "Started" },
                            { label: "Queued", value: "Queued" },
                            {
                                label: "Completed",
                                value: "Completed",
                            },
                            { label: "Late", value: "Late" },
                        ],
                    },
                ]}
                pageCount={pageCount}
                hideHeader={simple}
                hideFooter={simple}
            ></DataTable2>
        </div>
    );
}
