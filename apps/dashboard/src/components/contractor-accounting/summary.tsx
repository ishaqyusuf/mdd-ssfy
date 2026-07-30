"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { formatMoneyCents } from "@gnd/contractor-accounting";
import { cn } from "@gnd/ui/cn";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import {
	ArrowDownToLine,
	ArrowUpFromLine,
	BadgeDollarSign,
	WalletCards,
} from "lucide-react";

const cards = [
	{
		key: "openingBalanceCents",
		label: "Opening balance",
		icon: WalletCards,
		accent: "text-violet-700 dark:text-violet-400",
	},
	{
		key: "earnedCents",
		label: "Earned",
		icon: BadgeDollarSign,
		accent: "text-emerald-700 dark:text-emerald-400",
	},
	{
		key: "payoutCents",
		label: "Paid",
		icon: ArrowUpFromLine,
		accent: "text-blue-700 dark:text-blue-400",
	},
	{
		key: "closingBalanceCents",
		label: "Closing balance",
		icon: ArrowDownToLine,
		accent: "text-amber-700 dark:text-amber-400",
	},
] as const;

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export function ContractorAccountingSummary() {
	const trpc = useTRPC();
	const { filters } = useContractorAccountingFilterParams();
	const input = {
		...filters,
		includeEntries: false,
	} as RouterInputs["contractorAccounting"]["summary"];
	const { data } = useSuspenseQuery(
		trpc.contractorAccounting.summary.queryOptions(input),
	);

	return (
		<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
							{currency.format(
								Number(formatMoneyCents(data.summary[card.key])),
							)}
						</p>
					</div>
				);
			})}
		</section>
	);
}

export function ContractorAccountingSummarySkeleton() {
	return (
		<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{cards.map((card) => (
				<div
					key={card.key}
					className="h-[104px] animate-pulse rounded-xl border bg-muted/40"
				/>
			))}
		</section>
	);
}
