"use client";

import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@gnd/ui/icons";
import { resolveSalesProductionWorkspaceQuery } from "@sales/production-workspace-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SalesProductionAnalyticsCard } from "./analytics-card";

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
			"customer.name": filters["customer.name"],
			phone: filters.phone,
			po: filters.po,
			item: filters.item,
			"sales.rep": filters["sales.rep"],
			invoice: filters.invoice,
			salesNo: filters.salesNo,
			priority: filters.priority,
		}),
	) as { data: Summary };
	const resolved = resolveSalesProductionWorkspaceQuery(filters);
	const isActiveQueue = resolved.tab === "queue";
	const cards = [
		{
			title: "Unassigned",
			value: data.summary.unassignedCount,
			description: "Needs an owner",
			color: "#fde68ad9",
			icon: (
				<Icons.user className="h-4 w-4 text-amber-800 dark:text-amber-300" />
			),
			active: isActiveQueue && filters.queue === "unassigned",
			onClick: () => activateQueue({ queue: "unassigned" }),
		},
		{
			title: "Past due",
			value: data.summary.pastDueCount,
			description: "Needs attention",
			color: "#fca5a5d9",
			icon: (
				<Icons.warning className="h-4 w-4 text-rose-700 dark:text-rose-400" />
			),
			active: isActiveQueue && filters.due === "overdue",
			onClick: () => activateQueue({ due: "overdue" }),
		},
		{
			title: "Due today",
			value: data.summary.dueTodayCount,
			description: "Due before close",
			color: "#fdba74d9",
			icon: (
				<Icons.time className="h-4 w-4 text-amber-700 dark:text-amber-400" />
			),
			active: isActiveQueue && filters.due === "today",
			onClick: () => activateQueue({ due: "today" }),
		},
		{
			title: "Awaiting review",
			value: data.summary.awaitingReviewCount,
			description: "Material decisions",
			color: "#c4b5fdd9",
			icon: (
				<Icons.copyDone className="h-4 w-4 text-violet-700 dark:text-violet-400" />
			),
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
			sort:
				update.due === "overdue" || update.due === "today" ? "due-asc" : null,
			production: null,
			productionDueDate: null,
			show: null,
		});
	}

	return (
		<section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
			{cards.map((card) => (
				<SalesProductionAnalyticsCard key={card.title} {...card} />
			))}
		</section>
	);
}
