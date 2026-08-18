"use client";

import { PageTabs } from "@/components/page-tabs";
import { SalesProductionColumnVisibility } from "@/components/tables-2/sales-production/column-visibility";
import {
	salesProductionFilterParamsSchema,
	useSalesProductionFilterParams,
} from "@/hooks/use-sales-production-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { resolveSalesProductionWorkspaceQuery } from "@sales/production-workspace-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, List } from "lucide-react";

import type { FilterDefinition } from "../midday-search-filter/filter-definitions";
import { SearchFilterTRPC } from "../midday-search-filter/search-filter-trpc";
import { salesProductionPageTabs } from "./tabs";

const workspaceFilters = [
	{
		key: "queue",
		label: "Queue state",
		type: "single-select",
		options: [
			{ label: "All open", value: "all" },
			{ label: "Unassigned", value: "unassigned" },
			{ label: "Ready", value: "ready" },
			{ label: "In progress", value: "in-progress" },
			{ label: "Blocked", value: "blocked" },
		],
	},
	{
		key: "due",
		label: "Due date",
		type: "single-select",
		options: [
			{ label: "Overdue", value: "overdue" },
			{ label: "Today", value: "today" },
			{ label: "Tomorrow", value: "tomorrow" },
		],
	},
	{
		key: "material",
		label: "Material state",
		type: "single-select",
		options: [
			{ label: "Available", value: "available" },
			{ label: "Needs review", value: "review" },
			{ label: "Blocked", value: "blocked" },
			{ label: "Unavailable", value: "unavailable" },
		],
	},
	{
		key: "sort",
		label: "Sort",
		type: "single-select",
		options: [
			{ label: "Priority", value: "priority" },
			{ label: "Due date: earliest", value: "due-asc" },
			{ label: "Due date: latest", value: "due-desc" },
			{ label: "Newest", value: "newest" },
			{ label: "Oldest", value: "oldest" },
		],
	},
] satisfies FilterDefinition[];

type DashboardSummary = {
	summary: {
		queueCount: number;
	};
};

export function SalesProductionHeader() {
	const trpc = useTRPC();
	const { filters } = useSalesProductionFilterParams();
	const { data: dashboard } = useSuspenseQuery(
		trpc.sales.productionSummary.queryOptions({
			q: filters.q,
			assignedToId: filters.assignedToId,
			priority: filters.priority,
		}),
	) as { data: DashboardSummary };
	const { data: serverFilters } = useSuspenseQuery(
		trpc.filters.salesProductions.queryOptions(),
	);
	const supportedServerFilters = (serverFilters || []).filter((filter) =>
		["q", "assignedToId", "priority"].includes(String(filter.value)),
	) as PageFilterData[];
	const resolved = resolveSalesProductionWorkspaceQuery(filters);
	const isReview = resolved.tab === "reviews";
	const isCompleted = resolved.tab === "completed";
	const isCalendar = resolved.view === "calendar";
	const activeWorkspaceFilters =
		isReview || isCalendar
			? []
			: isCompleted
				? workspaceFilters.filter(({ key }) =>
						["material", "sort"].includes(key),
					)
				: workspaceFilters;
	const activeServerFilters = isReview ? [] : supportedServerFilters;
	const hiddenFilterKeys = [
		"tab",
		"view",
		"production",
		...(isReview
			? [
					"assignedToId",
					"priority",
					"queue",
					"due",
					"date",
					"material",
					"sort",
					"productionDueDate",
					"show",
					"label",
				]
			: isCompleted
				? ["queue", "due", "date", "productionDueDate", "show", "label"]
				: []),
	];
	return (
		<div className="min-w-0">
			<SearchFilterProvider
				args={[{ filterSchema: salesProductionFilterParamsSchema }]}
			>
				<SearchFilterTRPC
					placeholder="Search order, customer, or sales number..."
					filterList={[...activeServerFilters, ...activeWorkspaceFilters]}
					hiddenFilterKeys={hiddenFilterKeys}
					pageTabs={
						<PageTabs
							portal={false}
							allTitle="Active"
							allCount={dashboard.summary.queueCount}
							allActiveParam={{
								key: "tab",
								value: "queue",
							}}
							activeParams={{
								tab: resolved.tab,
								view: resolved.view,
								production: null,
								productionDueDate: null,
								show: null,
								label: null,
								...(isReview
									? {
											queue: null,
											due: null,
											date: null,
											material: null,
											sort: null,
											assignedToId: null,
											priority: null,
										}
									: isCompleted
										? { queue: null, due: null, date: null }
										: {}),
							}}
							tabs={salesProductionPageTabs}
							maxVisible={{ base: 3, lg: 3, "2xl": 3 }}
						/>
					}
					toolbarActions={
						<>
							{!isReview && !isCompleted ? (
								<SalesProductionDisplayToggle isCalendar={isCalendar} />
							) : null}
							{!isReview && !isCalendar ? (
								<SalesProductionColumnVisibility />
							) : null}
						</>
					}
				/>
			</SearchFilterProvider>
		</div>
	);
}

function SalesProductionDisplayToggle({
	isCalendar,
}: {
	isCalendar: boolean;
}) {
	const { setFilters } = useSalesProductionFilterParams();

	return (
		<div className="inline-flex h-9 items-center rounded-md border bg-muted/60 p-0.5">
			<Button
				type="button"
				size="sm"
				variant={isCalendar ? "ghost" : "secondary"}
				aria-pressed={!isCalendar}
				onClick={() => setFilters({ tab: "queue", view: "table" })}
				className={cn(
					"h-8 gap-1.5 rounded-sm px-2",
					!isCalendar && "bg-background shadow-xs",
				)}
			>
				<List className="size-4" />
				<span className="hidden xl:inline">Table</span>
			</Button>
			<Button
				type="button"
				size="sm"
				variant={isCalendar ? "secondary" : "ghost"}
				aria-pressed={isCalendar}
				onClick={() =>
					setFilters({
						tab: "queue",
						view: "calendar",
						queue: null,
						due: null,
						material: null,
						sort: null,
						show: null,
						productionDueDate: null,
					})
				}
				className={cn(
					"h-8 gap-1.5 rounded-sm px-2",
					isCalendar && "bg-background shadow-xs",
				)}
			>
				<CalendarDays className="size-4" />
				<span className="hidden xl:inline">Calendar</span>
			</Button>
		</div>
	);
}
