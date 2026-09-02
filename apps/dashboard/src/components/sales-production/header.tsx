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
import { getStatusFilterOptionColor } from "@gnd/utils/filter-option-colors";
import { resolveSalesProductionWorkspaceQuery } from "@sales/production-workspace-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import type { FilterDefinition } from "../midday-search-filter/filter-definitions";
import { SearchFilterTRPC } from "../midday-search-filter/search-filter-trpc";
import { createSalesProductionPageTabs } from "./tabs";

const workspaceFilters = [
	{
		key: "queue",
		label: "Queue state",
		icon: "tasks",
		type: "single-select",
		options: [
			{ label: "All open", value: "all" },
			{ label: "Unassigned", value: "unassigned" },
			{ label: "Ready", value: "ready" },
			{ label: "In progress", value: "in-progress" },
			{ label: "Blocked", value: "blocked" },
		].map((option) => ({
			...option,
			color: getStatusFilterOptionColor(option.value),
		})),
	},
	{
		key: "due",
		label: "Due status",
		icon: "calendar",
		type: "single-select",
		options: [
			{ label: "Overdue", value: "overdue" },
			{ label: "Today", value: "today" },
			{ label: "Tomorrow", value: "tomorrow" },
			{ label: "Unscheduled", value: "unscheduled" },
		].map((option) => ({
			...option,
			color: getStatusFilterOptionColor(option.value),
		})),
	},
	{
		key: "production.dueDate",
		label: "Production due date",
		icon: "calendar",
		type: "date-range",
	},
	{
		key: "dateRange",
		label: "Order date",
		icon: "calendar",
		type: "date-range",
	},
	{
		key: "material",
		label: "Material state",
		icon: "products",
		type: "single-select",
		options: [
			{ label: "Available", value: "available" },
			{ label: "Needs review", value: "review" },
			{ label: "Blocked", value: "blocked" },
			{ label: "Unavailable", value: "unavailable" },
		].map((option) => ({
			...option,
			color: getStatusFilterOptionColor(option.value),
		})),
	},
	{
		key: "sort",
		label: "Sort by",
		icon: "Sort",
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
		dueTodayCount: number;
		unscheduledCount: number;
		pastDueCount: number;
		awaitingReviewCount: number;
		completedCount: number;
	};
};

export function SalesProductionHeader() {
	const trpc = useTRPC();
	const { filters } = useSalesProductionFilterParams();
	const { data: dashboard } = useSuspenseQuery(
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
	) as { data: DashboardSummary };
	const { data: serverFilters } = useSuspenseQuery(
		trpc.filters.salesProductions.queryOptions(),
	);
	const supportedServerFilters = (serverFilters || []).filter((filter) =>
		[
			"q",
			"customer.name",
			"phone",
			"po",
			"sales.rep",
			"salesNo",
			"item",
			"invoice",
			"assignedToId",
			"priority",
		].includes(String(filter.value)),
	) as PageFilterData[];
	const resolved = resolveSalesProductionWorkspaceQuery(filters);
	const pageTabs = createSalesProductionPageTabs(dashboard.summary);
	const isReview = resolved.tab === "reviews";
	const isCompleted = resolved.tab === "completed";
	const isCalendar = resolved.view === "calendar";
	const activeWorkspaceFilters =
		isReview || isCalendar
			? []
			: isCompleted
				? workspaceFilters.filter(({ key }) =>
						["production.dueDate", "dateRange", "material", "sort"].includes(
							key,
						),
					)
				: workspaceFilters;
	const activeServerFilters = isReview
		? []
		: isCalendar
			? supportedServerFilters.filter((filter) =>
					["q", "assignedToId", "priority"].includes(String(filter.value)),
				)
			: supportedServerFilters;
	const hiddenFilterKeys = [
		"tab",
		"view",
		"calendarView",
		"calendarDate",
		"production",
		...(isReview
			? [
					"customer.name",
					"phone",
					"po",
					"item",
					"sales.rep",
					"invoice",
					"salesNo",
					"assignedToId",
					"priority",
					"queue",
					"due",
					"date",
					"dateRange",
					"material",
					"sort",
					"production.dueDate",
					"productionDueDate",
					"show",
					"label",
				]
			: isCalendar
				? [
						"customer.name",
						"phone",
						"po",
						"item",
						"sales.rep",
						"invoice",
						"salesNo",
						"queue",
						"due",
						"date",
						"dateRange",
						"material",
						"sort",
						"production.dueDate",
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
					pageTabsLayout="adaptive"
					pageTabs={
						<PageTabs
							portal={false}
							showAll={false}
							activeParams={{
								tab: isCalendar ? "calendar" : resolved.tab,
								view: resolved.view,
								production: null,
								productionDueDate: null,
								calendarView: null,
								calendarDate: null,
								show: null,
								label: null,
								...(isReview
									? {
											queue: null,
											due: null,
											date: null,
											dateRange: null,
											material: null,
											sort: null,
											"production.dueDate": null,
											assignedToId: null,
											priority: null,
										}
									: isCompleted
										? { queue: null, due: null, date: null }
										: {}),
							}}
							tabs={pageTabs}
							maxVisible={{ base: 3, lg: 7, "2xl": 7 }}
						/>
					}
					toolbarActions={
						!isReview && !isCalendar ? (
							<SalesProductionColumnVisibility />
						) : null
					}
				/>
			</SearchFilterProvider>
		</div>
	);
}
