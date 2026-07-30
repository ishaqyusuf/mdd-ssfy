"use client";

import { SalesFinanceInsightsSkeleton } from "@/components/sales-finance/insights-skeleton";
import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import type {
	SalesFinanceAnalytics,
	SalesFinanceExceptionCode,
	SalesFinancePaymentMethod,
	SalesFinanceReviewAgeBucket,
	SalesFinanceTrendGranularity,
} from "@gnd/sales/payment-system";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import type { ChartConfig } from "@gnd/ui/chart";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@gnd/ui/chart";
import { useQuery } from "@gnd/ui/tanstack";
import { CheckCircle2, CircleAlert, Clock3, RefreshCcw } from "lucide-react";
import {
	Area,
	Bar,
	CartesianGrid,
	ComposedChart,
	Line,
	XAxis,
	YAxis,
} from "recharts";

const compactCurrency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	notation: "compact",
	maximumFractionDigits: 1,
});

const trendChartConfig = {
	receivedAmount: {
		label: "Received",
		color: "var(--chart-2)",
	},
	netAmount: {
		label: "Net",
		color: "var(--chart-1)",
	},
	refundedAmount: {
		label: "Refunds",
		color: "var(--chart-5)",
	},
} satisfies ChartConfig;

const paymentMethodLabels: Record<SalesFinancePaymentMethod, string> = {
	card: "Card",
	check: "Check",
	zelle: "Zelle",
	cash: "Cash",
	wire: "Wire",
	unclassified: "Unclassified",
};

const paymentMethodColors: Record<SalesFinancePaymentMethod, string> = {
	card: "var(--chart-1)",
	check: "var(--chart-2)",
	zelle: "var(--chart-3)",
	cash: "var(--chart-4)",
	wire: "var(--chart-5)",
	unclassified: "var(--muted-foreground)",
};

const reviewAgeLabels: Record<SalesFinanceReviewAgeBucket, string> = {
	"0_7_days": "0–7 days",
	"8_14_days": "8–14 days",
	"15_30_days": "15–30 days",
	"31_plus_days": "31+ days",
};

const reviewReasonLabels: Record<SalesFinanceExceptionCode, string> = {
	missing_customer: "Missing customer",
	unclassified_method: "Unclassified method",
	missing_reference: "Missing reference",
	application_mismatch: "Application mismatch",
	failed_payment: "Failed payment",
};

function formatTrendPeriod(
	start: Date | string,
	end: Date | string,
	granularity: SalesFinanceTrendGranularity,
) {
	const startDate = new Date(start);
	const endDate = new Date(end);

	if (granularity === "month") {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			year: "2-digit",
			timeZone: "UTC",
		}).format(startDate);
	}

	const startLabel = new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(startDate);
	if (granularity === "day") return startLabel;

	const endLabel = new Intl.DateTimeFormat("en-US", {
		month:
			startDate.getUTCMonth() === endDate.getUTCMonth() ? undefined : "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(endDate);

	return `${startLabel}–${endLabel}`;
}

export function SalesFinanceInsights() {
	const trpc = useTRPC();
	const { filters } = useSalesFinanceFilterParams();
	const enabled = useIdleQueryEnabled(500);
	const analyticsInput = filters as RouterInputs["salesFinance"]["analytics"];
	const query = useQuery(
		trpc.salesFinance.analytics.queryOptions(analyticsInput, {
			enabled,
			refetchOnWindowFocus: false,
			staleTime: 30_000,
		}),
	);

	if (!enabled || query.isPending) {
		return <SalesFinanceInsightsSkeleton />;
	}

	if (query.isError || !query.data) {
		return (
			<Card className="rounded-xl border-destructive/40 shadow-sm" role="alert">
				<CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
					<div>
						<p className="font-medium">Reporting snapshot unavailable</p>
						<p className="mt-1 text-sm text-muted-foreground">
							{query.error?.message ||
								"Finance analytics could not be loaded for these filters."}
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void query.refetch()}
					>
						<RefreshCcw className="mr-2 size-4" />
						Try again
					</Button>
				</CardContent>
			</Card>
		);
	}

	const data = query.data as unknown as SalesFinanceAnalytics;
	const trendData = data.trend.map((point) => ({
		...point,
		label: formatTrendPeriod(
			point.periodStart,
			point.periodEnd,
			data.period.granularity,
		),
	}));

	return (
		<section aria-labelledby="finance-reporting-title" className="space-y-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<h2 id="finance-reporting-title" className="text-sm font-semibold">
						Reporting snapshot
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Collections and review health from the active view and filters.
					</p>
				</div>
				<Badge variant="outline" className="rounded-full">
					{data.transactionCount.toLocaleString()} filtered payment
					{data.transactionCount === 1 ? "" : "s"}
				</Badge>
			</div>

			{data.transactionCount === 0 ? (
				<Card className="rounded-xl shadow-sm">
					<CardContent className="flex min-h-32 items-center justify-center p-6 text-center">
						<div>
							<p className="font-medium">No reporting data</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Adjust or clear the current Finance filters.
							</p>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3 lg:grid-cols-12">
					<CollectionsTrendCard
						data={trendData}
						granularity={data.period.granularity}
					/>
					<PaymentMethodMixCard data={data.methodMix} />
					<ReviewHealthCard
						reviewCount={data.reviewCount}
						age={data.reviewAge}
						reasons={data.reviewReasons}
					/>
				</div>
			)}
		</section>
	);
}

function CollectionsTrendCard({
	data,
	granularity,
}: {
	data: Array<{
		label: string;
		receivedAmount: number;
		refundedAmount: number;
		netAmount: number;
		transactionCount: number;
	}>;
	granularity: SalesFinanceTrendGranularity;
}) {
	return (
		<Card className="rounded-xl shadow-sm lg:col-span-8">
			<CardHeader className="p-4 pb-2">
				<CardTitle className="mb-0 text-sm font-semibold">
					Collections trend
				</CardTitle>
				<CardDescription className="text-xs">
					Received, net, and refunds by {granularity}.
				</CardDescription>
			</CardHeader>
			<CardContent className="p-4 pt-2">
				<ChartContainer
					config={trendChartConfig}
					className="aspect-auto h-[260px] w-full"
				>
					<ComposedChart
						accessibilityLayer
						data={data}
						margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
					>
						<defs>
							<linearGradient
								id="finance-received-fill"
								x1="0"
								x2="0"
								y1="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor="var(--color-receivedAmount)"
									stopOpacity={0.28}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-receivedAmount)"
									stopOpacity={0.03}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis
							axisLine={false}
							dataKey="label"
							interval="preserveStartEnd"
							minTickGap={24}
							tickLine={false}
							tickMargin={9}
						/>
						<YAxis
							axisLine={false}
							tickFormatter={(value) => compactCurrency.format(Number(value))}
							tickLine={false}
							tickMargin={8}
							width={54}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									indicator="dot"
									formatter={(value, name) => (
										<div className="flex min-w-36 items-center justify-between gap-4">
											<span className="text-muted-foreground">
												{trendChartConfig[name as keyof typeof trendChartConfig]
													?.label || name}
											</span>
											<span className="font-mono font-medium tabular-nums">
												{formatCurrency.format(Number(value))}
											</span>
										</div>
									)}
								/>
							}
						/>
						<ChartLegend content={<ChartLegendContent />} />
						<Area
							dataKey="receivedAmount"
							fill="url(#finance-received-fill)"
							stroke="var(--color-receivedAmount)"
							strokeWidth={2}
							type="monotone"
						/>
						<Line
							dataKey="netAmount"
							dot={false}
							stroke="var(--color-netAmount)"
							strokeWidth={2}
							type="monotone"
						/>
						<Bar
							barSize={7}
							dataKey="refundedAmount"
							fill="var(--color-refundedAmount)"
							radius={[3, 3, 0, 0]}
						/>
					</ComposedChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

function PaymentMethodMixCard({
	data,
}: {
	data: Array<{
		paymentMethod: SalesFinancePaymentMethod;
		transactionCount: number;
		receivedAmount: number;
		share: number;
	}>;
}) {
	return (
		<Card className="rounded-xl shadow-sm lg:col-span-4">
			<CardHeader className="p-4 pb-2">
				<CardTitle className="mb-0 text-sm font-semibold">
					Payment method mix
				</CardTitle>
				<CardDescription className="text-xs">
					Share of filtered gross receipts.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 p-4 pt-3">
				{data.map((method) => (
					<div key={method.paymentMethod} className="space-y-2">
						<div className="flex items-baseline justify-between gap-3">
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">
									{paymentMethodLabels[method.paymentMethod]}
								</p>
								<p className="text-[11px] text-muted-foreground">
									{method.transactionCount} payment
									{method.transactionCount === 1 ? "" : "s"}
								</p>
							</div>
							<div className="shrink-0 text-right">
								<p className="font-mono text-sm font-medium tabular-nums">
									{formatCurrency.format(method.receivedAmount)}
								</p>
								<p className="text-[11px] text-muted-foreground">
									{method.share.toLocaleString(undefined, {
										maximumFractionDigits: 1,
									})}
									%
								</p>
							</div>
						</div>
						<div
							aria-label={`${paymentMethodLabels[method.paymentMethod]} ${method.share}% of receipts`}
							aria-valuemax={100}
							aria-valuemin={0}
							aria-valuenow={method.share}
							className="h-1.5 overflow-hidden rounded-full bg-muted"
							role="progressbar"
							tabIndex={0}
						>
							<div
								className="h-full rounded-full"
								style={{
									backgroundColor: paymentMethodColors[method.paymentMethod],
									width: `${Math.min(100, Math.max(0, method.share))}%`,
								}}
							/>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function ReviewHealthCard({
	reviewCount,
	age,
	reasons,
}: {
	reviewCount: number;
	age: Array<{
		bucket: SalesFinanceReviewAgeBucket;
		transactionCount: number;
		exposureAmount: number;
	}>;
	reasons: Array<{
		code: SalesFinanceExceptionCode;
		transactionCount: number;
		exposureAmount: number;
	}>;
}) {
	const largestReasonCount = reasons.reduce(
		(max, reason) => Math.max(max, reason.transactionCount),
		0,
	);

	return (
		<Card className="rounded-xl shadow-sm lg:col-span-12">
			<CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2">
				<div>
					<CardTitle className="mb-0 text-sm font-semibold">
						Review health
					</CardTitle>
					<CardDescription className="mt-1 text-xs">
						Age and reason profile for filtered payments needing attention.
					</CardDescription>
				</div>
				{reviewCount > 0 ? (
					<Badge variant="outline" className="gap-1.5 rounded-full">
						<CircleAlert className="size-3.5 text-rose-600" />
						{reviewCount} open
					</Badge>
				) : (
					<Badge variant="outline" className="gap-1.5 rounded-full">
						<CheckCircle2 className="size-3.5 text-emerald-600" />
						Clear
					</Badge>
				)}
			</CardHeader>
			<CardContent className="grid gap-4 p-4 pt-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{age.map((bucket) => (
						<div
							key={bucket.bucket}
							className="rounded-lg border bg-muted/20 p-3"
						>
							<div className="flex items-center justify-between gap-2">
								<p className="text-xs font-medium text-muted-foreground">
									{reviewAgeLabels[bucket.bucket]}
								</p>
								<Clock3 className="size-3.5 text-muted-foreground" />
							</div>
							<p className="mt-3 font-mono text-xl font-semibold tabular-nums">
								{bucket.transactionCount}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{formatCurrency.format(bucket.exposureAmount)} payment value
							</p>
						</div>
					))}
				</div>

				<div className="rounded-lg border p-3">
					<p className="text-xs font-medium text-muted-foreground">
						Review reasons
					</p>
					{reasons.length ? (
						<div className="mt-3 space-y-3">
							{reasons.map((reason) => (
								<div key={reason.code} className="space-y-1.5">
									<div className="flex items-center justify-between gap-3 text-xs">
										<span>{reviewReasonLabels[reason.code]}</span>
										<span className="font-mono tabular-nums">
											{reason.transactionCount}
										</span>
									</div>
									<div className="h-1 overflow-hidden rounded-full bg-muted">
										<div
											className="h-full rounded-full bg-rose-500/75"
											style={{
												width: `${largestReasonCount ? (reason.transactionCount / largestReasonCount) * 100 : 0}%`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
							<CheckCircle2 className="size-4 text-emerald-600" />
							No review exceptions in this view.
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
