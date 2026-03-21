"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { ActionCell } from "../action-cell";
import { IconButton } from "@/components/icon-button";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";

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
        const { setParams } = useInventoryCategoryParams();
        return (
            <div className="flex justify-end gap-2">
                <ActionCell trash itemId={item.id}>
                    <IconButton
                        onClick={(e) => {
                            setParams({
                                editCategoryId: item.id,
                            });
                        }}
                        icon="edit"
                    />
                </ActionCell>
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
                <TCell.Primary>{item.title}</TCell.Primary>
                <TCell.Secondary>{item.type}</TCell.Secondary>
            </div>
            <TCell.Secondary>{item.description}</TCell.Secondary>
            <div className="flex items-center gap-4">
                <TCell.Secondary>
                    Variations: {item._count?.categoryVariantAttributes || 0}
                </TCell.Secondary>
                <TCell.Secondary>
                    Inventories: {item._count?.inventories || 0}
                </TCell.Secondary>
            </div>
        </div>
    );
}

