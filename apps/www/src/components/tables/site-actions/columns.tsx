"use client";

import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@/components/(clean-code)/progress";

export type Item = RouterOutputs["siteActions"]["index"]["data"][number];
export const columns: ColumnDef<Item>[] = [
    {
        header: "date",
        accessorKey: "uid",
        meta: {
            className: "w-16",
        },
        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Date>{item.createdAt}</TCell.Date>
            </div>
        ),
    },
    {
        header: "Action",
        accessorKey: "action",
        meta: {
            className: "",
        },
        cell: ({ row: { original: item } }) => (
            <div>
                <Progress>
                    <Progress.Status>{item.event}</Progress.Status>
                </Progress>
            </div>
        ),
    },
    {
        header: "Activity",
        accessorKey: "activity",
        cell: ({ row: { original: item } }) => (
            <div className="inline-flex gap-2 items-center">
                <div className="">
                    <TCell.Secondary className="font-mono$">
                        {item?.description}
                    </TCell.Secondary>
                    <TCell.Secondary>
                        {/* {JSON.stringify(item?.meta)} */}
                        {(item?.meta as any)?.description}
                    </TCell.Secondary>
                </div>
            </div>
        ),
    },
];
