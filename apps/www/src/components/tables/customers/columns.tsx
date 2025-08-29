"use client";

import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

export type Item = RouterOutputs["sales"]["customersIndex"]["data"][number];

const customer = {
    header: "Customer",
    accessorKey: "Customer",
    meta: {},
    cell: ({ row: { original: item } }) => item.name || item.businessName,
};
export const columns: ColumnDef<Item>[] = [customer];
