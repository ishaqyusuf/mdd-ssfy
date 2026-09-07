"use client";

import { OperationsCalendarPeriodPicker } from "@/components/operations-calendar/period-picker";
import {
	getOperationsCalendarPeriod,
	moveOperationsCalendarDate,
	resolveOperationsCalendarDate,
} from "@/components/operations-calendar/range";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	PlanningCard,
	type PlanningItem,
	type PlanningCardProps,
} from "./planning-calendar-card";
import { productionCalendarColors } from "./calendar-colors";
import { PlanningQueryState } from "./planning-query-state";

function CompactPlanningCard({ item, ...actions }: PlanningCardProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"w-full rounded border p-1 text-left text-xs",
						productionCalendarColors[item.presentation.tone],
					)}
				>
					<strong className="block break-words">{item.orderNo}</strong>
					<span className="block">{item.label}</span>
					{item.presentation.label !== item.label ? (
						<span className="block">{item.presentation.label}</span>
					) : null}
					<span className="block text-[10px]">Order production due date</span>
				</button>
			</PopoverTrigger>
			<PopoverContent className="max-h-[calc(100dvh-2rem)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto p-2">
				<PlanningCard item={item} {...actions} />
			</PopoverContent>
		</Popover>
	);
}

export function ProductionPlanningCalendar() {
	const trpc = useTRPC();
	const auth = useAuth();
	const overview = useSalesOverviewQuery();
	const cardActions = {
		canEditDueDate: auth.can.editOrders === true,
		onOpen: (orderNo: string) => overview.open2(orderNo, "sales-production"),
	};
	const { filters, setFilters } = useSalesProductionFilterParams();
	const anchor = resolveOperationsCalendarDate(
		filters.calendarDate || filters.date,
	);
	const period = getOperationsCalendarPeriod(anchor, filters.calendarView);
	const query = useQuery(
		trpc.sales.productionPlanningCalendar.queryOptions(
			{
				from: period.from,
				to: period.to,
				q: filters.q,
				priority: filters.priority,
			},
			{ staleTime: 60_000, refetchOnWindowFocus: false },
		),
	);
	const grouped = new Map<string, PlanningItem[]>();
	for (const item of query.data?.planning || []) {
		const items = grouped.get(item.dueDate) || [];
		items.push(item);
		grouped.set(item.dueDate, items);
	}
	const changeDate = (date: Date) =>
		void setFilters({ calendarDate: format(date, "yyyy-MM-dd") });
	return (
		<section className="space-y-3" aria-label="Production planning gaps">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						aria-label={`Previous ${filters.calendarView}`}
						onClick={() =>
							changeDate(
								moveOperationsCalendarDate(anchor, filters.calendarView, -1),
							)
						}
					>
						←
					</Button>
					<OperationsCalendarPeriodPicker
						date={anchor}
						view={filters.calendarView}
						onSelect={changeDate}
					/>
					<Button
						variant="outline"
						size="sm"
						aria-label={`Next ${filters.calendarView}`}
						onClick={() =>
							changeDate(
								moveOperationsCalendarDate(anchor, filters.calendarView, 1),
							)
						}
					>
						→
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => changeDate(new Date())}
					>
						Today
					</Button>
				</div>
				<Tabs
					value={filters.calendarView}
					onValueChange={(value) =>
						void setFilters({
							calendarView: value === "month" ? "month" : "week",
						})
					}
				>
					<TabsList>
						<TabsTrigger value="week">Week</TabsTrigger>
						<TabsTrigger value="month">Month</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
			<p className="text-sm text-muted-foreground">
				{query.data
					? `${query.data.count}${query.data.truncated ? "+" : ""} planning gaps`
					: "Planning gaps"}{" "}
				· Order production due dates with incomplete assignment coverage.
			</p>
			<PlanningQueryState pending={query.isPending} failed={query.isError} retry={() => void query.refetch()}>
			{query.data && (
				<>
					{query.data.truncated ? (
						<p role="status" className="text-sm">
							This period exceeds the calendar limit. Narrow the date range or
							search to see the remaining orders.
						</p>
					) : null}
					{query.data.count === 0 ? (
						<p className="rounded border p-6 text-sm">
							{query.data.truncated ? "No planning gaps were found in the loaded results. Narrow the period or search to check the remaining orders." : "No planning gaps match this period and filters."}
						</p>
					) : null}
					<div className="max-w-full overflow-auto rounded border">
						<div
							className={cn(
								"grid",
								filters.calendarView === "month"
									? "min-w-[980px] grid-cols-7"
									: "grid-cols-1 md:min-w-[980px] md:grid-cols-7",
							)}
						>
							{period.days.map((day) => {
								const date = format(day, "yyyy-MM-dd");
								const items = grouped.get(date) || [];
								const compact = filters.calendarView === "month";
								return (
									<div key={date} className="min-w-0 border-b border-r p-2">
										<h3 className="mb-2 text-xs font-semibold">
											{format(day, "EEE, MMM d")} · {items.length}
										</h3>
										<div className="space-y-2">
											{items
												.slice(0, compact ? 3 : items.length)
												.map((item) =>
													compact ? (
														<CompactPlanningCard
															key={item.id}
															item={item}
															{...cardActions}
														/>
													) : (
														<PlanningCard
															key={item.id}
															item={item}
															{...cardActions}
														/>
													),
												)}
										</div>
										{compact && items.length > 3 ? (
											<Popover>
												<PopoverTrigger asChild>
													<Button size="sm" variant="ghost">
														+{items.length - 3} more
													</Button>
												</PopoverTrigger>
												<PopoverContent className="max-h-[70dvh] w-80 max-w-[calc(100vw-2rem)] space-y-2 overflow-y-auto">
													{items.map((item) => (
														<PlanningCard
															key={item.id}
															item={item}
															{...cardActions}
														/>
													))}
												</PopoverContent>
											</Popover>
										) : null}
									</div>
								);
							})}
						</div>
					</div>
				</>
			)}
			</PlanningQueryState>
		</section>
	);
}
