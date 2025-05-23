"use client";

import { ActionCell } from "../action-cell";
import { ColumnDef, PageItemData } from "@/types/type";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useRolesParams } from "@/hooks/use-roles-params";
import { Badge } from "@gnd/ui/badge";
import { getEmployeeProfilesList } from "@/actions/get-employee-profiles";
import NumberFlow from "@number-flow/react";

export type Item = PageItemData<typeof getEmployeeProfilesList>;
export const columns: ColumnDef<Item>[] = [
    {
        header: "Title",
        accessorKey: "title",

        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Primary className="">{item.name}</TCell.Primary>
                <TCell.Secondary className="">
                    {`${item._count?.employees || 0}`} employees
                </TCell.Secondary>
            </div>
        ),
    },
    {
        header: "Details",
        accessorKey: "details",

        cell: ({ row: { original: item } }) => (
            <div className="flex items-center w-full text-center">
                {!item.salesComissionPercentage || (
                    <Badge variant="outline" className="">
                        <NumberFlow
                            value={item.salesComissionPercentage}
                            suffix="% commission"
                        />
                    </Badge>
                )}
                {!item.discount || (
                    <Badge variant="outline" className="">
                        <NumberFlow value={item.discount} suffix="% paycut" />
                    </Badge>
                )}
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
        <ActionCell
            trash
            disableTrash={!!item?._count?.employees}
            itemId={item.id}
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
        </ActionCell>
    );
}
