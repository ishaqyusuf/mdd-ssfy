"use client";

import { ActionCell } from "../action-cell";
import { ColumnDef, ColumnMeta, PageItemData } from "@/types/type";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { _perm } from "@/components/sidebar/links";
import { getCustomerTransactionsAction } from "@/actions/get-customer-tx-action";
import { formatMoney } from "@/lib/use-number";
import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { Progress } from "@/components/(clean-code)/progress";
import { cn } from "@gnd/ui/cn";

import { CancelSalesTransactionAction } from "@/components/cancel-sales-transaction";

export type Item = PageItemData<typeof getCustomerTransactionsAction>;
export const columns: ColumnDef<Item>[] = [
    {
        header: "date",
        accessorKey: "uid",
        meta: {
            className: "w-16",
        },
        cell: ({ row: { original: item } }) => (
            <div>
                <TCell.Date>{item.createdAt}</TCell.Date>
            </div>
        ),
    },
    {
        header: "Amount",
        accessorKey: "amount",
        meta: {
            className: "text-end",
        },
        cell: ({ row: { original: item } }) => {
            const money = formatMoney(Math.abs(item.amount));
            return (
                <TCell.Secondary
                    className={cn(
                        "font-mono text-sm",
                        item.amount < 0 && "text-red-700/70",
                    )}
                >
                    {item.amount <= 0 ? `($${money})` : `$${money}`}
                </TCell.Secondary>
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
                    <span className="font-mono">{item.checkNo}</span>
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
                    text={item.orderIds || "-"}
                />
            </TCell.Secondary>
        ),
    },
    {
        header: "Sales Rep",
        accessorKey: "salesRep",
        meta: {
            // preventDefault: true,
        } as ColumnMeta,
        cell: ({ row: { original: item } }) => (
            <>
                {item.salesReps.map((rep, repId) => (
                    <TCell.Secondary key={repId}>{rep}</TCell.Secondary>
                ))}
            </>
        ),
    },
    {
        header: "Processed By",
        accessorKey: "processedBy",
        meta: {
            // preventDefault: true,
        } as ColumnMeta,
        cell: ({ row: { original: item } }) => (
            <>
                <TCell.Secondary>{item.authorName}</TCell.Secondary>
            </>
        ),
    },
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
            return (
                <ActionCell itemId={item.id}>
                    <Action item={item} />
                </ActionCell>
            );
        },
    },
];
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
                            "font-mono text-sm",
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
                    <span className="font-mono">{item.checkNo}</span>
                </Progress>
            </>
        ),
    },
    // {
    //     header: "Order #",
    //     accessorKey: "orderId",
    //     meta: {
    //         // preventDefault: true,
    //     } as ColumnMeta,
    //     cell: ({ row: { original: item } }) => (
    //         <TCell.Secondary>
    //             <TextWithTooltip
    //                 className="max-w-[100px] xl:max-w-[200px]"
    //                 text={item.orderIds || "-"}
    //             />
    //         </TCell.Secondary>
    //     ),
    // },
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
            return (
                <ActionCell itemId={item.id}>
                    <Action item={item} />
                </ActionCell>
            );
        },
    },
];
function Action({ item }: { item: Item }) {
    return (
        <>
            <CancelSalesTransactionAction
                status={item.status}
                customerTransactionId={item.id}
            />
        </>
    );
}
