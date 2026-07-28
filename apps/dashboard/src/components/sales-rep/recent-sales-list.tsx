"use client";

import { SalesPriorityBadge } from "@/components/sales-priority-control";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { getSalesOrderLifecycleStatusBadgeClassName } from "@gnd/sales/order-status";
import { Badge } from "@gnd/ui/badge";
import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { FormatAmount } from "@gnd/ui/custom/format-amount";
import { Icons } from "@gnd/ui/icons";
import NextLink from "next/link";

export type RecentSalesOrder =
	RouterOutputs["sales"]["getOrders"]["data"][number];

type Props = {
	orders: RecentSalesOrder[];
	onOpen: (orderUuid: string) => void;
};

export function RecentSalesList({ orders, onOpen }: Props) {
	return (
		<section
			aria-labelledby="recent-sales-heading"
			className="overflow-hidden rounded-lg border border-border bg-background"
		>
			<header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
				<div className="min-w-0">
					<h3
						className="truncate text-sm font-semibold"
						id="recent-sales-heading"
					>
						Recent Sales
					</h3>
					<p className="truncate text-xs text-muted-foreground">
						Up to 5 latest orders
					</p>
				</div>
				<NextLink
					className={cn(
						buttonVariants({ size: "sm", variant: "ghost" }),
						"shrink-0 gap-1.5 text-muted-foreground",
					)}
					href="/sales-book/orders"
				>
					View all
					<Icons.ArrowRight aria-hidden="true" className="size-3.5" />
				</NextLink>
			</header>

			{orders.length > 0 ? (
				<ul className="divide-y divide-border">
					{orders.map((order) => (
						<li key={order.uuid}>
							<button
								aria-label={`Open order ${order.orderId || order.uuid}`}
								className="group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5"
								onClick={() => onOpen(order.uuid)}
								type="button"
							>
								<div className="min-w-0">
									<div className="flex min-w-0 items-center gap-2">
										<span className="truncate font-mono text-sm font-semibold uppercase">
											{order.orderId || "Draft order"}
										</span>
										<SalesPriorityBadge
											className="h-5 shrink-0 px-1.5 text-[10px]"
											priority={order.priority}
										/>
									</div>
									<p className="truncate text-xs text-muted-foreground sm:text-sm">
										{order.customerName || "Unknown customer"}
									</p>
								</div>

								<div className="shrink-0 text-right">
									<p className="font-mono text-sm font-semibold tabular-nums">
										<FormatAmount amount={Number(order.invoiceTotal || 0)} />
									</p>
									<p className="text-xs text-muted-foreground">
										{order.salesDate || "No date"}
									</p>
								</div>

								<div className="col-span-2 flex min-w-0 items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
									<Badge
										className={cn(
											"h-6 max-w-full rounded-full border-0 px-2 text-[10px] font-medium",
											getSalesOrderLifecycleStatusBadgeClassName(order.status),
										)}
										variant="secondary"
									>
										<span className="truncate">
											{order.statusLabel || "Unknown"}
										</span>
									</Badge>
									<Icons.ChevronRight
										aria-hidden="true"
										className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
									/>
								</div>
							</button>
						</li>
					))}
				</ul>
			) : (
				<div className="flex flex-col items-center justify-center px-4 py-10 text-center">
					<div className="mb-3 rounded-full bg-muted p-2.5 text-muted-foreground">
						<Icons.orders aria-hidden="true" className="size-5" />
					</div>
					<h4 className="text-sm font-medium">No recent sales</h4>
					<p className="mt-1 max-w-sm text-xs text-muted-foreground">
						Create an order to start tracking recent sales activity.
					</p>
					<NextLink
						className={cn(
							buttonVariants({ size: "sm", variant: "outline" }),
							"mt-4",
						)}
						href="/sales-book/create-order"
					>
						Create sale
					</NextLink>
				</div>
			)}
		</section>
	);
}
