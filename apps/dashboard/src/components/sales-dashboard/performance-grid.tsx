"use client";

import { Avatar } from "@/components/avatar";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

function EmptyRow({ children }: { children: string }) {
	return (
		<div className="flex h-36 items-center justify-center px-6 text-center text-sm text-muted-foreground">
			{children}
		</div>
	);
}

export function SalesRecentOrdersCard() {
	const trpc = useTRPC();
	const overview = useSalesOverviewOpen();
	const { params } = useSalesDashboardParams();
	const query = useQuery(
		trpc.salesDashboard.getRecentSales.queryOptions({
			from: params.from,
			to: params.to,
		}),
	);

	return (
		<Card className="h-full min-w-0 overflow-hidden">
			<CardHeader>
				<CardTitle>Recent orders</CardTitle>
				<CardDescription>
					Latest orders inside the selected period.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				{query.isLoading ? (
					<ListSkeleton />
				) : query.data?.length ? (
					<ul className="divide-y">
						{query.data.map((order) => (
							<li key={order.id}>
								<button
									type="button"
									className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/50"
									onClick={() => overview.openOrder(order.orderNo)}
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">
											{order.customerName}
										</p>
										<p className="mt-1 truncate text-xs text-muted-foreground">
											{order.orderNo} ·{" "}
											{order.createdAt
												? format(order.createdAt, "MMM d, yyyy")
												: "Date unavailable"}
										</p>
									</div>
									<span className="shrink-0 font-mono text-sm font-medium">
										{formatCurrency.format(order.bookedSales)}
									</span>
								</button>
							</li>
						))}
					</ul>
				) : (
					<EmptyRow>No recent orders in this period.</EmptyRow>
				)}
			</CardContent>
		</Card>
	);
}

export function SalesRepPerformanceCard() {
	const trpc = useTRPC();
	const { params } = useSalesDashboardParams();
	const query = useQuery(
		trpc.salesDashboard.getSalesRepLeaderboard.queryOptions({
			from: params.from,
			to: params.to,
		}),
	);

	return (
		<Card className="h-full min-w-0 overflow-hidden">
			<CardHeader>
				<CardTitle>Sales rep performance</CardTitle>
				<CardDescription>
					Ranked by booked sales for this period.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				{query.isLoading ? (
					<ListSkeleton />
				) : query.data?.length ? (
					<ul className="divide-y">
						{query.data.slice(0, 5).map((rep) => (
							<li key={rep.id} className="flex items-center gap-3 px-6 py-3">
								<Avatar name={rep.name} className="size-8" />
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{rep.name}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{rep.orderCount} orders ·{" "}
										{formatCurrency.format(rep.averageOrderValue)} AOV
									</p>
								</div>
								<span className="shrink-0 font-mono text-sm font-medium">
									{formatCurrency.format(rep.bookedSales)}
								</span>
							</li>
						))}
					</ul>
				) : (
					<EmptyRow>No sales rep activity in this period.</EmptyRow>
				)}
			</CardContent>
		</Card>
	);
}

export function SalesTopProductsCard() {
	const trpc = useTRPC();
	const { params } = useSalesDashboardParams();
	const query = useQuery(
		trpc.salesDashboard.getTopProducts.queryOptions({
			from: params.from,
			to: params.to,
		}),
	);

	return (
		<Card className="h-full min-w-0 overflow-hidden">
			<CardHeader>
				<CardTitle>Product performance</CardTitle>
				<CardDescription>
					Top lines ranked by booked line value.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				{query.isLoading ? (
					<ListSkeleton />
				) : query.data?.length ? (
					<ul className="divide-y">
						{query.data.slice(0, 5).map((product) => (
							<li
								key={product.name}
								className="flex items-center gap-3 px-6 py-3"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{product.name}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{product.count.toLocaleString()} units · {product.lineCount}{" "}
										lines
									</p>
								</div>
								<span className="shrink-0 font-mono text-sm font-medium">
									{formatCurrency.format(product.bookedSales)}
								</span>
							</li>
						))}
					</ul>
				) : (
					<EmptyRow>No product activity in this period.</EmptyRow>
				)}
			</CardContent>
		</Card>
	);
}

export function SalesChannelCard() {
	const trpc = useTRPC();
	const { params } = useSalesDashboardParams();
	const query = useQuery(
		trpc.salesDashboard.getSalesChannelBreakdown.queryOptions({
			from: params.from,
			to: params.to,
		}),
	);
	const total =
		query.data?.reduce((sum, channel) => sum + channel.bookedSales, 0) || 0;

	return (
		<Card className="h-full min-w-0 overflow-hidden">
			<CardHeader>
				<CardTitle>Sales channels</CardTitle>
				<CardDescription>
					Where selected-period bookings originated.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{query.isLoading ? (
					<ListSkeleton />
				) : query.data?.length ? (
					query.data.slice(0, 6).map((channel) => {
						const share = total ? (channel.bookedSales / total) * 100 : 0;
						return (
							<div key={channel.channel} className="space-y-2">
								<div className="flex items-center justify-between gap-3 text-sm">
									<div className="min-w-0">
										<p className="truncate font-medium capitalize">
											{channel.channel.replaceAll("-", " ")}
										</p>
										<p className="text-xs text-muted-foreground">
											{channel.orderCount} orders
										</p>
									</div>
									<span className="font-mono font-medium">
										{formatCurrency.format(channel.bookedSales)}
									</span>
								</div>
								<div className="h-1.5 overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary"
										style={{ width: `${Math.max(2, share)}%` }}
									/>
								</div>
							</div>
						);
					})
				) : (
					<EmptyRow>No channel activity in this period.</EmptyRow>
				)}
			</CardContent>
		</Card>
	);
}

function ListSkeleton() {
	return (
		<div className="space-y-3 p-6">
			{["primary", "secondary", "tertiary", "quaternary"].map((id) => (
				<Skeleton key={id} className="h-10 w-full" />
			))}
		</div>
	);
}
