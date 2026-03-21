"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

export type Item = RouterOutputs["sales"]["customersIndex"]["data"][number];
interface ItemProps {
    item: Item;
}

const customer= {
    header: "Customer",
    accessorKey: "Customer",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <div>
            <TCell.Primary className="uppercase">
                {item.name || item.businessName}
            </TCell.Primary>
        </div>
    ),
};
export const columns: ColumnDef<Item>[] = [customer];
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
            <TCell.Primary className="uppercase">
                {item.name || item.businessName}
            </TCell.Primary>
        </div>
    );
}
