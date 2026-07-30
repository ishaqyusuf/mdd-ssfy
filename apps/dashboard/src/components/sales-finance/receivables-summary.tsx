"use client";

import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	BadgeDollarSign,
	CalendarClock,
	Clock3,
	Clock6,
	Clock9,
	TriangleAlert,
} from "lucide-react";

const cards = [
	{
		key: "totalOutstanding",
		countKey: "receivableCount",
		label: "Total outstanding",
		icon: BadgeDollarSign,
		accent: "text-blue-700 dark:text-blue-400",
	},
	{
		key: "current",
		label: "Current",
		icon: CalendarClock,
		accent: "text-emerald-700 dark:text-emerald-400",
	},
	{
		key: "1_30",
		label: "1–30 days",
		icon: Clock3,
		accent: "text-amber-600 dark:text-amber-400",
	},
	{
		key: "31_60",
		label: "31–60 days",
		icon: Clock6,
		accent: "text-orange-600 dark:text-orange-400",
	},
	{
		key: "61_90",
		label: "61–90 days",
		icon: Clock9,
		accent: "text-rose-600 dark:text-rose-400",
	},
	{
		key: "90_plus",
		label: "90+ days",
		icon: TriangleAlert,
		accent: "text-red-700 dark:text-red-400",
	},
] as const;

const RECEIVABLE_SUMMARY_SKELETON_IDS = [
	"total",
	"current",
	"1-30",
	"31-60",
	"61-90",
	"90-plus",
] as const;

export function SalesFinanceReceivablesSummary() {
	const trpc = useTRPC();
	const { receivableFilters } = useSalesFinanceFilterParams();
	const { data } = useSuspenseQuery(
		trpc.salesFinance.receivablesSummary.queryOptions(
			receivableFilters as RouterInputs["salesFinance"]["receivablesSummary"],
		),
	);

	return (
		<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
			{cards.map((card) => {
				const Icon = card.icon;
				const isTotal = card.key === "totalOutstanding";
				const value = isTotal
					? data.totalOutstanding
					: data.bucketAmounts[card.key];
				const count = isTotal
					? data.receivableCount
					: data.bucketCounts[card.key];

				return (
					<div
						key={card.key}
						className="rounded-xl border bg-card p-4 shadow-sm"
					>
						<div className="mb-3 flex items-center justify-between gap-3">
							<p className="text-xs font-medium text-muted-foreground">
								{card.label}
							</p>
							<Icon className={cn("size-4", card.accent)} />
						</div>
						<p className="truncate font-mono text-lg font-semibold tracking-tight">
							{formatCurrency.format(value)}
						</p>
						<div className="mt-2 flex items-center justify-between gap-2">
							<span className="text-xs text-muted-foreground">
								{count} {count === 1 ? "invoice" : "invoices"}
							</span>
							{isTotal && data.unreconciledCount ? (
								<Badge variant="outline" className="text-[10px] text-amber-700">
									{data.unreconciledCount} to review
								</Badge>
							) : null}
						</div>
					</div>
				);
			})}
		</section>
	);
}

export function SalesFinanceReceivablesSummarySkeleton() {
	return (
		<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
			{RECEIVABLE_SUMMARY_SKELETON_IDS.map((skeletonId) => (
				<div
					key={skeletonId}
					className="h-[118px] animate-pulse rounded-xl border bg-muted/40"
				/>
			))}
		</section>
	);
}
