"use client";

import { ResponsiveMetric } from "@/components/responsive-metric";
import { SalesReportingPeriodControl } from "@/components/sales-dashboard/period-control";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
	ArrowRight,
	BadgeDollarSign,
	BanknoteArrowDown,
	BanknoteArrowUp,
	BriefcaseBusiness,
	CircleAlert,
	Clock3,
	FileText,
	Handshake,
	Plus,
	ReceiptText,
	ShoppingCart,
	Sparkles,
	TrendingUp,
	Users,
	WalletCards,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";

const SalesRepPerformanceCard = dynamic(
	() =>
		import("./performance-card").then(
			(module) => module.SalesRepPerformanceCard,
		),
	{
		loading: () => <Skeleton className="h-[388px] rounded-xl" />,
	},
);

function formatChange(value?: number | null) {
	if (value == null) return "No prior-period baseline";
	if (value === 0) return "No change from prior period";
	return `${value > 0 ? "+" : ""}${value.toFixed(1)}% vs prior period`;
}

function safeDateLabel(value: Date | string | null | undefined) {
	if (!value) return "Date unavailable";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Date unavailable"
		: format(date, "MMM d");
}

function ActivityIcon({
	type,
}: {
	type: "order" | "quote" | "payment" | "commission" | "request";
}) {
	const Icon =
		type === "order"
			? ShoppingCart
			: type === "quote"
				? FileText
				: type === "payment"
					? BanknoteArrowDown
					: type === "commission"
						? BadgeDollarSign
						: Handshake;

	return (
		<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
			<Icon className="size-4" />
		</span>
	);
}

export function SalesRepDashboardWorkspace() {
	const trpc = useTRPC();
	const { params } = useSalesDashboardParams();
	const salesOverview = useSalesOverviewQuery();
	const input = { from: params.from, to: params.to };
	const overview = useQuery(
		trpc.salesRepDashboard.overview.queryOptions(input),
	);
	const trend = useQuery(trpc.salesRepDashboard.trend.queryOptions(input));
	const activity = useQuery(
		trpc.salesRepDashboard.activity.queryOptions(input),
	);
	const data = overview.data;

	return (
		<div className="min-w-0 space-y-4 pb-20 sm:space-y-5 sm:pb-8">
			<header className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between lg:pb-5">
				<div className="min-w-0">
					<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
						<Sparkles className="size-3.5" />
						Sales command center
					</div>
					<h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
						Welcome back, {data?.firstName || "there"}
					</h1>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
						Your bookings, cash activity, follow-ups, and commissions in one
						focused view.
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<SalesReportingPeriodControl />
					<div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
						<Button asChild className="h-9 gap-2">
							<Link href="/sales-form/create-order">
								<Plus className="size-4" />
								New order
							</Link>
						</Button>
						<Button asChild className="h-9 gap-2" variant="outline">
							<Link href="/sales-form/create-quote">
								<FileText className="size-4" />
								New quote
							</Link>
						</Button>
					</div>
				</div>
			</header>

			{overview.isLoading ? (
				<DashboardSummarySkeleton />
			) : (
				<section
					aria-label="My sales summary"
					className="grid grid-cols-2 overflow-hidden rounded-xl border bg-background sm:gap-3 sm:overflow-visible sm:border-0 sm:bg-transparent lg:grid-cols-3 2xl:grid-cols-6"
				>
					<ResponsiveMetric
						icon={TrendingUp}
						subtitle={formatChange(data?.kpis.change.bookedSales)}
						title="Booked sales"
						value={formatCurrency.format(data?.kpis.bookedSales || 0)}
					/>
					<ResponsiveMetric
						icon={BanknoteArrowDown}
						subtitle={formatChange(data?.payments.change)}
						title="Cash applied"
						value={formatCurrency.format(data?.payments.applied || 0)}
					/>
					<ResponsiveMetric
						icon={ShoppingCart}
						subtitle={formatChange(data?.kpis.change.orderCount)}
						title="Orders"
						value={(data?.kpis.orderCount || 0).toLocaleString()}
					/>
					<ResponsiveMetric
						icon={FileText}
						subtitle={formatChange(data?.kpis.change.quoteCount)}
						title="Quotes"
						value={(data?.kpis.quoteCount || 0).toLocaleString()}
					/>
					<ResponsiveMetric
						icon={ReceiptText}
						subtitle={`${data?.receivables.receivableCount || 0} open invoices`}
						title="Receivables"
						value={formatCurrency.format(
							data?.receivables.totalOutstanding || 0,
						)}
					/>
					<ResponsiveMetric
						icon={BadgeDollarSign}
						subtitle={`${data?.commissions.pendingCount || 0} pending items`}
						title="Commission due"
						value={formatCurrency.format(data?.commissions.pending || 0)}
					/>
				</section>
			)}

			<section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
				{trend.isLoading ? (
					<Skeleton className="h-[388px] rounded-xl" />
				) : (
					<SalesRepPerformanceCard data={trend.data || []} />
				)}
				<Card className="min-w-0 overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-start justify-between gap-3">
							<div>
								<CardTitle>Needs attention</CardTitle>
								<CardDescription>
									The most urgent work across your sales pipeline.
								</CardDescription>
							</div>
							<Badge
								variant={data?.attention.total ? "destructive" : "secondary"}
							>
								{data?.attention.total || 0}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{overview.isLoading ? (
							<AttentionSkeleton />
						) : data?.attention.total ? (
							<>
								<AttentionGroup
									count={
										data.receivables.bucketCounts["1_30"] +
										data.receivables.bucketCounts["31_60"] +
										data.receivables.bucketCounts["61_90"] +
										data.receivables.bucketCounts["90_plus"]
									}
									href="/sales-book/finance?tab=receivables"
									icon={CircleAlert}
									label="Overdue receivables"
									renderedCount={data.attention.overdueReceivables.length}
									tone="text-destructive"
								>
									{data.attention.overdueReceivables.map((item) => (
										<button
											className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted"
											key={item.id}
											onClick={() => salesOverview.open(item.orderNo, "sales")}
											type="button"
										>
											<span className="min-w-0">
												<span className="block truncate text-sm font-medium">
													{item.customerName}
												</span>
												<span className="block text-xs text-muted-foreground">
													{item.orderNo} · {item.daysOverdue}d overdue
												</span>
											</span>
											<span className="shrink-0 text-sm font-medium">
												{formatCurrency.format(item.amountDue)}
											</span>
										</button>
									))}
								</AttentionGroup>
								<AttentionGroup
									count={data.attention.expiringQuoteCount}
									href="/sales-book/quotes"
									icon={Clock3}
									label="Quotes expiring soon"
									renderedCount={Math.min(data.attention.expiringQuotes.length, 2)}
								>
									{data.attention.expiringQuotes.slice(0, 2).map((item) => (
										<button
											className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted"
											key={item.id}
											onClick={() => salesOverview.open(item.orderNo, "quote")}
											type="button"
										>
											<span className="min-w-0">
												<span className="block truncate text-sm font-medium">
													{item.customerName}
												</span>
												<span className="block text-xs text-muted-foreground">
													{item.orderNo} · due {safeDateLabel(item.goodUntil)}
												</span>
											</span>
											<span className="shrink-0 text-sm font-medium">
												{formatCurrency.format(item.grandTotal)}
											</span>
										</button>
									))}
								</AttentionGroup>
								<AttentionGroup
									count={data.attention.urgentOrderCount}
									href="/sales-book/orders"
									icon={BriefcaseBusiness}
									label="High-priority orders"
									renderedCount={Math.min(data.attention.urgentOrders.length, 2)}
								>
									{data.attention.urgentOrders.slice(0, 2).map((item) => (
										<button
											className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted"
											key={item.id}
											onClick={() => salesOverview.open(item.orderNo, "sales")}
											type="button"
										>
											<span className="min-w-0">
												<span className="block truncate text-sm font-medium">
													{item.customerName}
												</span>
												<span className="block text-xs text-muted-foreground">
													{item.orderNo} · {item.priority?.toLowerCase()}
												</span>
											</span>
											<span className="shrink-0 text-sm font-medium">
												{formatCurrency.format(item.grandTotal)}
											</span>
										</button>
									))}
								</AttentionGroup>
								<AttentionGroup
									count={data.requests.pending}
									href="/sales-rep#recent-activity"
									icon={Handshake}
									label="Dealer requests"
								/>
							</>
						) : (
							<div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
								<span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
									<Sparkles className="size-5" />
								</span>
								<p className="mt-3 text-sm font-medium">You’re all caught up</p>
								<p className="mt-1 text-xs text-muted-foreground">
									No urgent receivables, quotes, orders, or requests.
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</section>

			<section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
				<Card className="min-w-0 overflow-hidden" id="recent-activity">
					<CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
						<div>
							<CardTitle>Recent activity</CardTitle>
							<CardDescription>
								Orders, quotes, payments, commissions, and requests.
							</CardDescription>
						</div>
						<Button
							asChild
							className="hidden sm:inline-flex"
							size="sm"
							variant="ghost"
						>
							<Link href="/sales-book/orders">
								View sales
								<ArrowRight className="ml-1 size-4" />
							</Link>
						</Button>
					</CardHeader>
					<CardContent className="px-3 sm:px-6">
						{activity.isLoading ? (
							<ActivitySkeleton />
						) : activity.data?.items.length ? (
							<ul className="divide-y">
								{activity.data.items.map((item) => (
									<li key={item.id}>
										<button
											className="flex w-full min-w-0 items-center gap-3 py-3 text-left hover:text-foreground"
											onClick={() => {
												if (!item.orderNo) return;
												salesOverview.open(
													item.orderNo,
													item.type === "quote" || item.type === "request"
														? "quote"
														: "sales",
												);
											}}
											type="button"
										>
											<ActivityIcon type={item.type} />
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-medium">
													{item.title}
												</span>
												<span className="block truncate text-xs text-muted-foreground">
													{item.description}
												</span>
											</span>
											<span className="shrink-0 text-right">
												<span className="block text-sm font-medium">
													{formatCurrency.format(item.amount)}
												</span>
												<span className="block text-xs text-muted-foreground">
													{item.occurredAt
														? formatDistanceToNowStrict(
																new Date(item.occurredAt),
																{ addSuffix: true },
															)
														: "Recently"}
												</span>
											</span>
										</button>
									</li>
								))}
							</ul>
						) : (
							<div className="flex min-h-56 items-center justify-center text-center text-sm text-muted-foreground">
								No activity in this period.
							</div>
						)}
					</CardContent>
				</Card>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
					<Card>
						<CardHeader className="pb-3">
							<CardTitle>Commission</CardTitle>
							<CardDescription>
								Earnings and payouts for the selected period.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<MoneyRow
								icon={BanknoteArrowUp}
								label="Earned"
								value={data?.commissions.earned || 0}
							/>
							<MoneyRow
								icon={WalletCards}
								label="Paid"
								value={data?.commissions.paid || 0}
							/>
							<MoneyRow
								icon={BadgeDollarSign}
								label="Pending balance"
								value={data?.commissions.pending || 0}
							/>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-3">
							<CardTitle>Receivables health</CardTitle>
							<CardDescription>
								Outstanding balances on your orders.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<MoneyRow
								icon={ReceiptText}
								label="Outstanding"
								value={data?.receivables.totalOutstanding || 0}
							/>
							<MoneyRow
								icon={CircleAlert}
								label="Overdue"
								value={data?.receivables.overdueAmount || 0}
							/>
							<div className="flex items-center justify-between gap-3 rounded-lg bg-muted/55 px-3 py-2.5">
								<span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
									<Users className="size-4 shrink-0" />
									<span className="truncate">Customers owing</span>
								</span>
								<span className="font-semibold">
									{data?.receivables.customerCount || 0}
								</span>
							</div>
							<Button asChild className="w-full" variant="outline">
								<Link href="/sales-book/finance?tab=receivables">
									Open Sales Finance
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}

function AttentionGroup({
	children,
	count,
	renderedCount,
	href,
	icon: Icon,
	label,
	tone,
}: {
	children?: ReactNode;
	count: number;
	renderedCount?: number;
	href: string;
	icon: typeof CircleAlert;
	label: string;
	tone?: string;
}) {
	if (!count) return null;

	const remainingCount =
		typeof renderedCount === "number" && count > renderedCount
			? count - renderedCount
			: 0;

	return (
		<div className="border-b pb-3 last:border-b-0 last:pb-0">
			<div className="mb-1 flex items-center justify-between gap-3">
				<div className={`flex min-w-0 items-center gap-2 ${tone || ""}`}>
					<Icon className="size-4 shrink-0" />
					<span className="truncate text-sm font-medium">{label}</span>
					<Badge variant="secondary">{count}</Badge>
				</div>
				<Button asChild className="h-7 px-2 text-xs" size="sm" variant="ghost">
					<Link href={href}>View</Link>
				</Button>
			</div>
			{children ? <div>{children}</div> : null}
			{remainingCount > 0 ? (
				<div className="mt-1.5 px-2 text-xs text-muted-foreground">
					<Link className="hover:underline hover:text-foreground font-medium" href={href}>
						+ {remainingCount} more {label.toLowerCase()}
					</Link>
				</div>
			) : null}
		</div>
	);
}

function MoneyRow({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof BadgeDollarSign;
	label: string;
	value: number;
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-lg bg-muted/55 px-3 py-2.5">
			<span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
				<Icon className="size-4 shrink-0" />
				<span className="truncate">{label}</span>
			</span>
			<span className="shrink-0 font-semibold">
				{formatCurrency.format(value)}
			</span>
		</div>
	);
}

function DashboardSummarySkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
			{["sales", "payments", "orders", "quotes", "due", "commission"].map(
				(item) => (
					<Skeleton className="h-[104px] rounded-xl sm:h-[126px]" key={item} />
				),
			)}
		</div>
	);
}

function AttentionSkeleton() {
	return (
		<div className="space-y-3">
			{["one", "two", "three"].map((item) => (
				<div className="space-y-2" key={item}>
					<Skeleton className="h-5 w-36" />
					<Skeleton className="h-10 w-full" />
				</div>
			))}
		</div>
	);
}

function ActivitySkeleton() {
	return (
		<div className="space-y-2">
			{["one", "two", "three", "four", "five"].map((item) => (
				<div className="flex items-center gap-3 py-2" key={item}>
					<Skeleton className="size-9 rounded-full" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-3 w-1/2" />
					</div>
				</div>
			))}
		</div>
	);
}
