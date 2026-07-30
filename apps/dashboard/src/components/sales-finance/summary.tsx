"use client";

import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	ArrowDownToLine,
	BadgeDollarSign,
	CircleAlert,
	RefreshCcw,
	WalletCards,
} from "lucide-react";

const cards = [
	{
		key: "receivedAmount",
		label: "Payments received",
		icon: ArrowDownToLine,
		accent: "text-emerald-700 dark:text-emerald-400",
	},
	{
		key: "netAmount",
		label: "Net collections",
		icon: BadgeDollarSign,
		accent: "text-blue-700 dark:text-blue-400",
	},
	{
		key: "refundedAmount",
		label: "Refunds",
		icon: RefreshCcw,
		accent: "text-amber-700 dark:text-amber-400",
	},
	{
		key: "unappliedAmount",
		label: "Unapplied",
		icon: WalletCards,
		accent: "text-violet-700 dark:text-violet-400",
	},
] as const;

export function SalesFinanceSummary() {
	const trpc = useTRPC();
	const { filters } = useSalesFinanceFilterParams();
	const { tab: _, ...summaryFilters } = filters;
	const { data } = useSuspenseQuery(
		trpc.salesFinance.summary.queryOptions(
			summaryFilters as RouterInputs["salesFinance"]["summary"],
		),
	);

	return (
		<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			{cards.map((card) => {
				const Icon = card.icon;
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
						<p className="font-mono text-xl font-semibold tracking-tight">
							{formatCurrency.format(data[card.key])}
						</p>
					</div>
				);
			})}
			<div className="rounded-xl border bg-card p-4 shadow-sm">
				<div className="mb-3 flex items-center justify-between gap-3">
					<p className="text-xs font-medium text-muted-foreground">
						Needs review
					</p>
					<CircleAlert className="size-4 text-rose-700 dark:text-rose-400" />
				</div>
				<div className="flex items-end justify-between gap-3">
					<p className="font-mono text-xl font-semibold tracking-tight">
						{data.reviewCount}
					</p>
					<Badge variant="outline">{data.transactionCount} payments</Badge>
				</div>
			</div>
		</section>
	);
}

export function SalesFinanceSummarySkeleton() {
	const skeletonIds = ["received", "net", "refunds", "unapplied", "review"];

	return (
		<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			{skeletonIds.map((id) => (
				<div
					key={id}
					className="h-[104px] animate-pulse rounded-xl border bg-muted/40"
				/>
			))}
		</section>
	);
}
