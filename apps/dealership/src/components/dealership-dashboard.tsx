"use client";

import { getDealerRequestNextStep } from "@/lib/dealer-next-step";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowUpRight,
	CircleDollarSign,
	FileText,
	ReceiptText,
	Users,
} from "lucide-react";
import Link from "next/link";
import { DealerNextStep } from "./dealer-portal/dealer-next-step";

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function date(value?: Date | string | null) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
	}).format(new Date(value));
}

export function DealershipDashboard({
	dealerName,
}: {
	dealerName: string;
}) {
	const trpc = useTRPC();
	const dashboardQuery = useQuery(trpc.dealerPortal.dashboard.queryOptions());
	const dashboard = dashboardQuery.data;
	const metrics = [
		{
			label: "Open Quotes",
			value: String(dashboard?.openQuotes ?? 0),
			icon: FileText,
			href: "/quotes",
		},
		{
			label: "Pending Requests",
			value: String(dashboard?.pendingRequests ?? 0),
			icon: ArrowUpRight,
			href: "/quotes",
		},
		{
			label: "Active Orders",
			value: String(dashboard?.activeOrders ?? 0),
			icon: ReceiptText,
			href: "/orders",
		},
		{
			label: "Customer Balance",
			value: currency(dashboard?.unpaidAmount),
			icon: CircleDollarSign,
			href: "/orders?amountDue=due",
		},
		{
			label: "Paid Revenue",
			value: currency(dashboard?.paidRevenue),
			icon: CircleDollarSign,
			href: "/orders?amountDue=paid",
		},
		{
			label: "Dealer Earnings",
			value: currency(dashboard?.dealerEarnings),
			icon: ArrowUpRight,
			href: "/orders",
		},
		{
			label: "Dealer Taxes",
			value: currency(dashboard?.dealerFacingTax),
			icon: ReceiptText,
			href: "/orders",
		},
		{
			label: "Customers",
			value: String(dashboard?.customers ?? 0),
			icon: Users,
			href: "/customers",
		},
	];

	return (
		<div className="space-y-8">
			<header className="flex flex-col gap-3 border-b pb-6 md:flex-row md:items-center md:justify-between">
				<div>
					<p className="text-sm font-medium text-muted-foreground">
						Dealer workspace
					</p>
					<h2 className="text-2xl font-semibold tracking-normal">
						{dealerName}
					</h2>
				</div>
				<Button asChild>
					<Link href="/quotes/new">Create quote</Link>
				</Button>
			</header>

			<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => {
					const Icon = metric.icon;

					return (
						<Link
							className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
							href={metric.href}
							key={metric.label}
						>
							<div className="mb-4 flex items-center justify-between">
								<p className="text-sm font-medium text-muted-foreground">
									{metric.label}
								</p>
								<Icon className="size-4 text-muted-foreground" />
							</div>
							<p className="text-2xl font-semibold">
								{dashboardQuery.isPending ? "-" : metric.value}
							</p>
						</Link>
					);
				})}
			</section>

			<section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
				<div className="rounded-lg border bg-card p-5">
					<div className="mb-5 flex items-center justify-between">
						<h3 className="text-base font-semibold">Recent Orders</h3>
						<Button asChild size="sm" variant="outline">
							<Link href="/orders">View all</Link>
						</Button>
					</div>
					<div className="divide-y">
						{dashboard?.recentOrders?.length ? (
							dashboard.recentOrders.map((order) => (
								<Link
									className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_120px_110px]"
									href={`/orders/${order.id}`}
									key={order.id}
								>
									<div className="min-w-0">
										<p className="truncate font-medium">{order.orderId}</p>
										<p className="truncate text-xs text-muted-foreground">
											{order.customerName}
										</p>
									</div>
									<p className="text-muted-foreground">
										{currency(order.amountDue)} due
									</p>
									<p className="text-muted-foreground md:text-right">
										{date(order.createdAt)}
									</p>
								</Link>
							))
						) : (
							<div className="py-10 text-center text-sm text-muted-foreground">
								No recent orders
							</div>
						)}
					</div>
				</div>

				<div className="rounded-lg border bg-card p-5">
					<div className="mb-5 flex items-center justify-between">
						<h3 className="text-base font-semibold">Request Activity</h3>
						<Button asChild size="sm" variant="outline">
							<Link href="/quotes">Quotes</Link>
						</Button>
					</div>
					<div className="space-y-3">
						{dashboard?.recentRequests?.length ? (
							dashboard.recentRequests.map((request) => {
								const content = (
									<div key={`request-content-${request.id}`}>
										<div className="flex items-center justify-between gap-3">
											<p className="truncate text-sm font-medium">
												{request.sale?.orderId || "Dealer request"}
											</p>
											<Badge variant="outline">{request.status}</Badge>
										</div>
										<p className="mt-1 text-xs text-muted-foreground">
											{request.sale?.customerName || "Customer"} ·{" "}
											{date(request.createdAt)}
										</p>
										<div className="mt-3">
											<DealerNextStep
												compact
												guidance={getDealerRequestNextStep({
													status: request.status,
												})}
											/>
										</div>
									</div>
								);

								return request.status === "approved" && request.sale?.id ? (
									<Link
										className="block rounded-md border p-3 transition-colors hover:bg-muted/40"
										href={`/orders/${request.sale.id}`}
										key={request.id}
									>
										{content}
									</Link>
								) : (
									<div className="rounded-md border p-3" key={request.id}>
										{content}
									</div>
								);
							})
						) : (
							<div className="py-10 text-center text-sm text-muted-foreground">
								No order requests yet
							</div>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}
