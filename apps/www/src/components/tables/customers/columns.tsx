"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

export type Item = RouterOutputs["sales"]["customersIndex"]["data"][number];

const customer = {
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
