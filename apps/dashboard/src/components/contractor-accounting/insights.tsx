"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { formatMoneyCents } from "@gnd/contractor-accounting";
import { useQuery } from "@gnd/ui/tanstack";
import { useEffect, useState } from "react";

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	notation: "compact",
});

export function ContractorAccountingInsights() {
	const trpc = useTRPC();
	const { filters } = useContractorAccountingFilterParams();
	const [enabled, setEnabled] = useState(false);
	useEffect(() => {
		const timer = window.setTimeout(() => setEnabled(true), 500);
		return () => window.clearTimeout(timer);
	}, []);
	const input = {
		...filters,
		includeEntries: false,
	} as RouterInputs["contractorAccounting"]["insights"];
	const query = useQuery({
		...trpc.contractorAccounting.insights.queryOptions(input),
		enabled,
	});
	if (!enabled || query.isPending) return <ContractorInsightsSkeleton />;
	if (!query.data || query.isError) return null;
	const points = query.data.trend.points;
	const max = Math.max(
		1,
		...points.map((point) => Math.abs(point.closingBalanceCents)),
	);
	return (
		<section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
			<div className="rounded-xl border bg-card p-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-medium text-sm">Liability trend</p>
						<p className="text-xs text-muted-foreground">
							Continuous {query.data.trend.interval} closing balance
						</p>
					</div>
				</div>
				<div className="mt-5 flex h-28 items-end gap-1">
					{points.slice(-60).map((point) => (
						<div
							key={point.period}
							className="min-w-1 flex-1 rounded-t bg-primary/70"
							style={{
								height: `${Math.max(3, (Math.abs(point.closingBalanceCents) / max) * 100)}%`,
							}}
							title={`${point.period}: ${currency.format(
								Number(formatMoneyCents(point.closingBalanceCents)),
							)}`}
						/>
					))}
				</div>
			</div>
			<div className="rounded-xl border bg-card p-4">
				<p className="font-medium text-sm">Aging mix</p>
				<div className="mt-4 space-y-3">
					{[
						["Current", query.data.aging.currentCents],
						["1–30 days", query.data.aging.days1To30Cents],
						["31–60 days", query.data.aging.days31To60Cents],
						["61–90 days", query.data.aging.days61To90Cents],
						["Over 90", query.data.aging.over90DaysCents],
					].map(([label, cents]) => (
						<div key={String(label)} className="flex justify-between gap-3">
							<span className="text-xs text-muted-foreground">{label}</span>
							<span className="font-mono text-xs font-medium">
								{currency.format(Number(formatMoneyCents(Number(cents))))}
							</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export function ContractorInsightsSkeleton() {
	return (
		<div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
			<div className="h-44 animate-pulse rounded-xl border bg-muted/30" />
			<div className="h-44 animate-pulse rounded-xl border bg-muted/30" />
		</div>
	);
}
