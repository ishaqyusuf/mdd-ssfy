"use client";

import { ColumnDef, ColumnMeta } from "@/types/type";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { _perm } from "@/components/sidebar/links";

import { formatMoney } from "@/lib/use-number";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Progress } from "@/components/(clean-code)/progress";
import { cn } from "@gnd/ui/cn";

import Money from "@/components/_v1/money";
import { RouterOutputs } from "@api/trpc/routers/_app";

export type Item =
    RouterOutputs["sales"]["getSalesAccountings"]["data"][number];
interface ItemProps {
    item: Item;
}
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
                        "font-mono$ text-sm",
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
        header: "Sub Total",
        accessorKey: "subTotal",
        meta: {
            // preventDefault: true,
        } as ColumnMeta,
        cell: ({ row: { original: item } }) => {
            const money = formatMoney(Math.abs(item.subTotal));
            return (
                <TCell.Secondary>
                    <Money value={money} />
                </TCell.Secondary>
            );
        },
    },
    {
        header: "Labor",
        accessorKey: "status",
        meta: {
            // preventDefault: true,
        } as ColumnMeta,
        cell: ({ row: { original: item } }) => {
            const money = formatMoney(Math.abs(item.laborCost));
            return (
                <TCell.Secondary>
                    <Money value={money} />
                </TCell.Secondary>
            );
        },
    },
    {
        header: "Delivery",
        accessorKey: "delivery",
        meta: {
            // preventDefault: true,
        } as ColumnMeta,
        cell: ({ row: { original: item } }) => {
            const money = formatMoney(Math.abs(item.deliveryCost));
            return (
                <TCell.Secondary>
                    <Money value={money} />
                </TCell.Secondary>
            );
        },
    },

    {
        header: "",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
        },
        cell: ({ row: { original: item } }) => {
            return (
                <div>
                    <Action item={item} />
                </div>
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
            return <div>{/* <Action item={item} /> */}</div>;
        },
    },
];
function Action({ item }: { item: Item }) {
    return (
        <>
            {/* <CancelSalesTransactionAction
                status={item.status}
                customerTransactionId={item.id}
            /> */}
        </>
    );
}
