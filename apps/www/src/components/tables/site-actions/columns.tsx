"use client";

import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@gnd/ui/custom/progress";

export type Item = RouterOutputs["siteActions"]["index"]["data"][number];
interface ItemProps {
    item: Item;
}
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
export const mobileColumn: ColumnDef<Item>[] = [
    {
        header: "",
        accessorKey: "row",
        meta: {
            className: "flex-1 p-0",
        },
        cell: ({ row: { original: item } }) => {
            return <ItemCard item={item} />;
        },
    },
];
function ItemCard({ item }: ItemProps) {
    return (
        <div className="flex flex-col space-y-2 p-3 border-b">
            <div>
                <TCell.Date>{item.createdAt}</TCell.Date>
            </div>
            <div>
                <Progress>
                    <Progress.Status>{item.event}</Progress.Status>
                </Progress>
            </div>
            <div>
                <TCell.Secondary className="font-mono$">
                    {item?.description}
                </TCell.Secondary>
                <TCell.Secondary>
                    {(item?.meta as any)?.description}
                </TCell.Secondary>
            </div>
        </div>
    );
}
