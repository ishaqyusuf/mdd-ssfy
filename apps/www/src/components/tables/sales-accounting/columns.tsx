"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import type { ColumnDef, ColumnMeta } from "@/types/type";

import { formatMoney } from "@/lib/use-number";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";

import Money from "@/components/_v1/money";
import type { RouterOutputs } from "@api/trpc/routers/_app";

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
                {item.salesReps.map((rep) => (
                    <TCell.Secondary key={rep}>{rep}</TCell.Secondary>
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
        accessorKey: "labor",
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
	const amount = formatAccountingAmount(item.amount);
	const subtotal = formatCurrencyValue(item.subTotal);
	const salesReps = item.salesReps.filter(Boolean).join(", ");
	const statusTone = getStatusTone(item.status);
	const meta = [item.paymentMethod, item.checkNo ? `Check ${item.checkNo}` : null]
		.filter(Boolean)
		.join(" / ");

	return (
		<div className="group border-border/70 border-b bg-background px-3 py-2.5 transition-colors active:bg-muted/60">
			<div className="flex min-w-0 items-center gap-3">
				<div
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-md border",
						item.amount < 0
							? "border-red-200 bg-red-50 text-red-700"
							: "border-emerald-200 bg-emerald-50 text-emerald-700",
					)}
				>
					<Icons.Receipt className="size-4" />
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-center justify-between gap-3">
						<p className="min-w-0 truncate text-sm font-medium uppercase leading-5 text-foreground">
							{item.description || "Accounting transaction"}
						</p>

						<div
							className={cn(
								"shrink-0 whitespace-nowrap text-right font-mono text-sm font-semibold leading-5 tabular-nums",
								item.amount < 0 ? "text-red-700" : "text-foreground",
							)}
						>
							{amount}
						</div>
					</div>

					<div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] leading-4 text-muted-foreground">
						<TCell.Date>{item.createdAt}</TCell.Date>
						<span className="text-muted-foreground/40">|</span>
						<Badge
							variant="outline"
							className={cn(
								"h-4 shrink-0 border px-1.5 text-[9px] font-medium capitalize leading-none",
								statusTone,
							)}
						>
							{item.status || "Pending"}
						</Badge>
						{meta ? (
							<>
								<span className="text-muted-foreground/40">|</span>
								<span className="min-w-0 truncate">{meta}</span>
							</>
						) : null}
					</div>

					<div className="mt-1 flex min-w-0 items-center justify-between gap-3 text-[11px] leading-4 text-muted-foreground">
						<div className="min-w-0 truncate">
							{item.orderIds || salesReps
								? [item.orderIds, salesReps].filter(Boolean).join(" / ")
								: "No linked order"}
						</div>
						<span className="shrink-0 font-mono tabular-nums">{subtotal}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function formatAccountingAmount(value: number) {
	const money = formatMoney(Math.abs(value));
	return value <= 0 ? `($${money})` : `$${money}`;
}

function formatCurrencyValue(value: number) {
	return `$${formatMoney(Math.abs(value || 0))}`;
}

function getStatusTone(status?: string | null) {
	const normalized = String(status || "").toLowerCase();
	if (normalized.includes("success") || normalized.includes("paid"))
		return "border-emerald-200 bg-emerald-50 text-emerald-700";
	if (
		normalized.includes("fail") ||
		normalized.includes("cancel") ||
		normalized.includes("void")
	)
		return "border-red-200 bg-red-50 text-red-700";
	return "border-slate-200 bg-slate-50 text-slate-700";
}
