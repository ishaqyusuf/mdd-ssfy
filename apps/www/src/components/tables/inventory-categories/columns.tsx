"use client";

import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { ActionCell } from "../action-cell";

export type Item =
    RouterOutputs["inventories"]["inventoryCategories"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const category: Column = {
    header: "Category",
    accessorKey: "Category",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <>
            <TCell.Primary>{item.title}</TCell.Primary>
            <TCell.Secondary>{item.type}</TCell.Secondary>
        </>
    ),
};
const description: Column = {
    header: "Description",
    accessorKey: "Description",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <TCell.Secondary>{item.description}</TCell.Secondary>
    ),
};
const variationCategory: Column = {
    header: "Variation Categories",
    accessorKey: "Variation Categories",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <TCell.Secondary>
            {item?._count?.categoryVariantAttributes || "None"}
        </TCell.Secondary>
    ),
};
const inventories: Column = {
    header: "Inventories",
    accessorKey: "Inventories",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <TCell.Secondary>{item._count?.inventories || "None"}</TCell.Secondary>
    ),
};
const action: Column = {
    header: "",
    accessorKey: "action",
    meta: {
        actionCell: true,
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => {
        return (
            <div className="flex gap-2">
                <ActionCell trash itemId={item.id}></ActionCell>
            </div>
        );
    },
};
export const columns: Column[] = [
    category,
    description,
    variationCategory,
    inventories,
    action,
];

