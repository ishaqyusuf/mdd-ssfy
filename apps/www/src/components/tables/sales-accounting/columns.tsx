"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import type { ColumnDef, ColumnMeta } from "@/types/type";

import { formatMoney } from "@/lib/use-number";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";

import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";

export type Item =
    RouterOutputs["sales"]["getSalesAccountings"]["data"][number];
export const customerTransactionsColumn: ColumnDef<Item>[] = [
    {
        header: "date",
        accessorKey: "uid",
        meta: {
            className: "",
        },
        cell: ({ row: { original: item } }) => {
            const money = formatMoney(Math.abs(item.amount));
            return (
                <div>
                    <TCell.Date>{item.createdAt}</TCell.Date>
                    <TCell.Secondary
                        className={cn(
                            "font-mono$ text-sm",
                            item.amount < 0 && "text-red-700/70",
                        )}
                    >
                        {item.amount <= 0 ? `($${money})` : `$${money}`}
                    </TCell.Secondary>
                </div>
            );
        },
    },

    {
        header: "Description",
        accessorKey: "description",
        meta: {
            // preventDefault: true,
        },
        cell: ({ row: { original: item } }) => (
            <>
                <TCell.Secondary className="whitespace-nowrap uppercase">
                    <TextWithTooltip
                        className="max-w-[150px] xl:max-w-[250px]"
                        text={item.description}
                    />
                </TCell.Secondary>
                <Progress>
                    <Progress.Status>{item.paymentMethod}</Progress.Status>
                    <span className="font-mono$">{item.checkNo}</span>
                </Progress>
            </>
        ),
    },
    {
        header: "Order #",
        accessorKey: "orderId",
        meta: {
            // preventDefault: true,
        } as ColumnMeta,
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary>
                <TextWithTooltip
                    className="max-w-[100px] xl:max-w-[200px]"
                    text={item.orderIds || "Wallet activity"}
                />
                {item.ordersCount > 1 ? (
                    <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                        Applied to {item.ordersCount} invoices
                    </Badge>
                ) : null}
            </TCell.Secondary>
        ),
    },
    // {
    //     header: "Sales Rep",
    //     accessorKey: "salesRep",
    //     meta: {
    //         // preventDefault: true,
    //     } as ColumnMeta,
    //     cell: ({ row: { original: item } }) => (
    //         <>
    //             {item.salesReps.map((rep, repId) => (
    //                 <TCell.Secondary key={repId}>{rep}</TCell.Secondary>
    //             ))}
    //         </>
    //     ),
    // },

    {
        header: "Payment Status",
        accessorKey: "status",
        meta: {
            // preventDefault: true,
        } as ColumnMeta,
        cell: ({ row: { original: item } }) => (
            <>
                <Progress>
                    <Progress.Status>{item.status}</Progress.Status>
                    <span>{item.reason}</span>
                </Progress>
            </>
        ),
    },
    {
        header: "",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
        },
        cell: ({ row: { original: item } }) => {
            return <CustomerTransactionAction item={item} />;
        },
    },
];
function CustomerTransactionAction({ item }: { item: Item }) {
    const modal = useTransactionOverviewModal();

    return (
        <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => modal.viewTx(item.id)}
        >
            <Icons.ReceiptText className="size-3.5" />
            View
        </Button>
    );
}
