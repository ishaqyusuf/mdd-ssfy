"use client";

import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Badge } from "@gnd/ui/badge";

type Item = RouterOutputs["sales"]["quotes"]["data"][number];
export const columns: ColumnDef<Item>[] = [
    {
        header: "Date",
        accessorKey: "quoteDate",
        meta: {},
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="font-mono">
                {item?.salesDate}
            </TCell.Secondary>
        ),
    },
    {
        header: "Quote #",
        accessorKey: "quoteId",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap">
                {item.orderId}
                {!item.orderId
                    ?.toUpperCase()
                    .endsWith(item.salesRepInitial) && (
                    <Badge className="font-mono" variant="secondary">
                        {item.salesRepInitial}
                    </Badge>
                )}
            </TCell.Secondary>
        ),
    },
    {
        header: "P.O",
        accessorKey: "po",
        meta: {
            className: "",
        },
        cell: ({ row: { original: item } }) => <div>{item?.poNo}</div>,
    },
    {
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row: { original: item } }) => (
            <TCell.Primary
                className={cn(
                    item.isBusiness && "text-blue-700",
                    "whitespace-nowrap uppercase",
                )}
            >
                <TextWithTooltip
                    className="max-w-[100px] xl:max-w-[200px]"
                    text={item.displayName || "-"}
                />
            </TCell.Primary>
        ),
    },
    {
        header: "Phone",
        accessorKey: "phone",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap">
                <TextWithTooltip
                    className="max-w-[85px] xl:max-w-[120px]"
                    text={item?.customerPhone || "-"}
                />
            </TCell.Secondary>
        ),
    },
    {
        header: "Address",
        accessorKey: "address",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary>
                <TextWithTooltip
                    className="max-w-[100px] xl:max-w-[200px]"
                    text={item?.address}
                />
            </TCell.Secondary>
        ),
    },
    {
        header: "Invoice",
        accessorKey: "invoice",
        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Money value={item.invoice.total} className="font-mono" />
            </div>
        ),
    },

    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
        },
        cell: ({ row: { original: item } }) => <></>,
    },
];
