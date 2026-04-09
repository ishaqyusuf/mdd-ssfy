"use client";

import { ColumnDef, PageItemData } from "@/types/type";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";

import { getRolesList } from "@/actions/get-roles";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useRolesParams } from "@/hooks/use-roles-params";
import { Badge } from "@gnd/ui/badge";
import { useAction } from "next-safe-action/hooks";

export type Item = PageItemData<typeof getRolesList>;
interface ItemProps {
    item: Item;
}
export const columns: ColumnDef<Item>[] = [
    {
        header: "Title",
        accessorKey: "title",

        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Primary className="">{item.name}</TCell.Primary>
                <TCell.Secondary className="">
                    {`${item._count?.ModelHasRoles || 0}`} employees
                </TCell.Secondary>
            </div>
        ),
    },
    {
        header: "Permissions",
        accessorKey: "permissions",

        cell: ({ row: { original: item } }) => (
            <div className="flex items-center w-full text-center">
                <Badge variant="outline" className="">
                    {item._count?.RoleHasPermissions}
                </Badge>
            </div>
        ),
    },

    {
        header: "",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
        },
        cell: ({ row: { original: item } }) => {
            return <Action item={item} />;
        },
    },
];
function Action({ item }: { item: Item }) {
    const r = useRolesParams();

    return (
        <div
        // trash
        // disableTrash={!!item?._count?.ModelHasRoles}
        // itemId={item.id}
        >
            <Button
                onClick={(e) => {
                    r.setParams({
                        roleForm: true,
                        roleEditId: item.id,
                    });
                }}
                variant="outline"
                size="xs"
            >
                <Icons.Edit className="size-4" />
            </Button>
        </div>
    );
}
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
            <TCell.Primary>{item.name}</TCell.Primary>
            <TCell.Secondary>
                {`${item._count?.ModelHasRoles || 0}`} employees
            </TCell.Secondary>
            <div>
                <Badge variant="outline">
                    {item._count?.RoleHasPermissions} permissions
                </Badge>
            </div>
        </div>
    );
}
