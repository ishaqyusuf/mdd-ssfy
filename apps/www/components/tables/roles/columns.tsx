"use client";

import { ActionCell } from "../action-cell";
import { ColumnDef, PageItemData } from "@/types/type";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";

import { getRolesList } from "@/actions/get-roles";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useRolesParams } from "@/hooks/use-roles-params";

export type Item = PageItemData<typeof getRolesList>;
export const columns: ColumnDef<Item>[] = [
    {
        header: "Title",
        accessorKey: "title",

        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Primary className="">{item.name}</TCell.Primary>
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
        <ActionCell itemId={item.id}>
            <Button
                onClick={(e) => {
                    r.setParams({
                        roleForm: true,
                        roleEditId: item.id,
                    });
                }}
                variant="outline"
                size="icon"
            >
                <Icons.Edit className="size-4" />
            </Button>
        </ActionCell>
    );
}
