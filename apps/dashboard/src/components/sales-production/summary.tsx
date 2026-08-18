"use client";

import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@gnd/ui/icons";
import { resolveSalesProductionWorkspaceQuery } from "@sales/production-workspace-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ComponentType } from "react";

type Summary = {
	summary: {
		unassignedCount: number;
		pastDueCount: number;
		dueTodayCount: number;
		awaitingReviewCount: number;
	};
};

export function SalesProductionSummary() {
	const trpc = useTRPC();
	const { filters, setFilters } = useSalesProductionFilterParams();
	const { data } = useSuspenseQuery(
		trpc.sales.productionSummary.queryOptions({
			q: filters.q,
			assignedToId: filters.assignedToId,
			priority: filters.priority,
		}),
	) as { data: Summary };
	const resolved = resolveSalesProductionWorkspaceQuery(filters);
	const isActiveQueue = resolved.tab === "queue";
	const cards = [
		{
			label: "Unassigned",
			value: data.summary.unassignedCount,
			detail: "Needs an owner",
			icon: Icons.user,
			accent: "text-blue-700 dark:text-blue-400",
			active: isActiveQueue && filters.queue === "unassigned",
			onClick: () => activateQueue({ queue: "unassigned" }),
		},
		{
			label: "Past due",
			value: data.summary.pastDueCount,
			detail: "Needs attention",
			icon: Icons.warning,
			accent: "text-rose-700 dark:text-rose-400",
			active: isActiveQueue && filters.due === "overdue",
			onClick: () => activateQueue({ due: "overdue" }),
		},
		{
			label: "Due today",
			value: data.summary.dueTodayCount,
			detail: "Due before close",
			icon: Icons.time,
			accent: "text-amber-700 dark:text-amber-400",
			active: isActiveQueue && filters.due === "today",
			onClick: () => activateQueue({ due: "today" }),
		},
		{
			label: "Awaiting review",
			value: data.summary.awaitingReviewCount,
			detail: "Material decisions",
			icon: Icons.copyDone,
			accent: "text-violet-700 dark:text-violet-400",
			active: resolved.tab === "reviews",
			onClick: () =>
				setFilters({
					tab: "reviews",
					view: "table",
					queue: null,
					due: null,
					date: null,
				}),
		},
	];

	function activateQueue(update: {
		queue?: "unassigned";
		due?: "overdue" | "today";
	}) {
		setFilters({
			tab: "queue",
			view: "table",
			queue: update.queue ?? null,
			due: update.due ?? null,
			date: null,
			production: null,
			productionDueDate: null,
			show: null,
		});
	}

	return (
		<section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
			{cards.map((card) => (
				<SummaryCard key={card.label} {...card} />
			))}
		</section>
	);
}

function SummaryCard({
	label,
	value,
	detail,
	icon: Icon,
	accent,
	active,
	onClick,
}: {
	label: string;
	value: number;
	detail: string;
	icon: ComponentType<{ className?: string }>;
	accent: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group min-h-24 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[104px] sm:p-4",
				active && "border-foreground bg-muted/40",
			)}
		>
			<div className="mb-3 flex items-center justify-between gap-3">
				<p className="truncate text-xs font-medium text-muted-foreground">
					{label}
				</p>
				<Icon className={cn("size-4", accent)} />
			</div>
			<div className="flex items-end justify-between gap-3">
				<p className="font-mono text-xl font-semibold tracking-tight tabular-nums">
					{value}
				</p>
				<p className="hidden truncate text-[11px] text-muted-foreground sm:block">
					{detail}
				</p>
			</div>
		</button>
	);
}
