"use client";

import { SalesListItem } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@/components/(clean-code)/progress";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@gnd/ui/badge";

export const columns: ColumnDef<SalesListItem>[] = [
    {
        header: "Date",
        accessorKey: "salesDate",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="font-mono">
                {item?.salesDate}
            </TCell.Secondary>
        ),
    },
    {
        header: "Order #",
        accessorKey: "order.no",
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
        header: "Pending",
        accessorKey: "pending",
        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Money
                    value={Math.abs(item.invoice.pending || 0)}
                    className={cn(
                        "font-mono font-medium text-muted-foreground",
                        item.invoice.pending > 0 && "text-red-700/80",
                        item.invoice.pending < 0 && "bg-emerald-700 text-white",
                    )}
                />
            </div>
        ),
    },
    {
        header: "Dispatch",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>
                {item?.deliveryOption || "Not set"}
            </Progress.Status>
        ),
    },
    {
        header: "Production",
        accessorKey: "production",
        cell: ({ row: { original: item } }) => (
            <Progress>
                <Progress.Status color={item.status.production?.color}>
                    {item.status.production?.scoreStatus ||
                        item.status.production?.status}
                </Progress.Status>
            </Progress>
        ),
    },
];
