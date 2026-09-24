"use client";

import { OperationsCalendarPeriodPicker } from "@/components/operations-calendar/period-picker";
import {
	type OperationsCalendarView,
	getOperationsCalendarPeriod,
	moveOperationsCalendarDate,
	resolveOperationsCalendarDate,
} from "@/components/operations-calendar/range";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format, isSameMonth, isToday } from "date-fns";
import { useQueryStates } from "nuqs";
import { parseAsString, parseAsStringEnum } from "nuqs/server";

const calendarParams = {
	calendarView: parseAsStringEnum(["week", "month"]).withDefault("month"),
	calendarDate: parseAsString,
};

export function CustomerServiceCalendar() {
	const trpc = useTRPC();
	const { setParams } = useCustomerServiceParams();
	const [filters, setFilters] = useQueryStates(calendarParams);
	const view = filters.calendarView as OperationsCalendarView;
	const anchor = resolveOperationsCalendarDate(filters.calendarDate);
	const period = getOperationsCalendarPeriod(anchor, view);
	const { data, isPending, isError } = useQuery(
		trpc.customerService.getCalendar.queryOptions(
			{ from: period.from, to: period.to },
			{ staleTime: 60_000, refetchOnWindowFocus: false },
		),
	);
	const byDate = new Map<string, NonNullable<typeof data>>();
	for (const item of data ?? []) {
		if (!item.scheduleDate) continue;
		const key = format(new Date(item.scheduleDate), "yyyy-MM-dd");
		byDate.set(key, [...(byDate.get(key) ?? []), item]);
	}

	function setDate(date: Date) {
		void setFilters({ calendarDate: format(date, "yyyy-MM-dd") });
	}

	return (
		<section aria-label="Work order calendar" className="min-w-0 space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						aria-label={`Previous ${view}`}
						onClick={() =>
							setDate(moveOperationsCalendarDate(anchor, view, -1))
						}
					>
						<Icons.ChevronLeft className="size-4" />
					</Button>
					<OperationsCalendarPeriodPicker
						date={anchor}
						view={view}
						onSelect={setDate}
					/>
					<Button
						variant="outline"
						size="icon"
						aria-label={`Next ${view}`}
						onClick={() => setDate(moveOperationsCalendarDate(anchor, view, 1))}
					>
						<Icons.ChevronRight className="size-4" />
					</Button>
					<Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>
						Today
					</Button>
				</div>
				<Tabs
					value={view}
					onValueChange={(value) =>
						void setFilters({ calendarView: value as OperationsCalendarView })
					}
				>
					<TabsList>
						<TabsTrigger value="week">Week</TabsTrigger>
						<TabsTrigger value="month">Month</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
			{isError ? (
				<p className="rounded-lg border p-6 text-sm text-destructive">
					Unable to load appointments. Try another period or refresh the page.
				</p>
			) : null}
			{isPending ? (
				<div className="h-96 animate-pulse rounded-xl border bg-muted/30" />
			) : null}
			{!isPending && !isError ? (
				<>
					{data?.length === 500 ? (
						<p className="text-xs text-amber-700">
							Showing the first 500 appointments in this period.
						</p>
					) : null}
					<div className="hidden overflow-hidden rounded-xl border bg-card md:block">
						<div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
							{period.days.slice(0, 7).map((day) => (
								<div key={day.toISOString()} className="p-2">
									{format(day, "EEE")}
								</div>
							))}
						</div>
						<div className="grid grid-cols-7">
							{period.days.map((day) => {
								const items = byDate.get(format(day, "yyyy-MM-dd")) ?? [];
								return (
									<div
										key={day.toISOString()}
										className="min-h-32 min-w-0 border-b border-r p-2"
									>
										<div className="mb-2 flex items-center justify-between">
											<span
												className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${isToday(day) ? "bg-primary text-primary-foreground" : isSameMonth(day, anchor) ? "" : "text-muted-foreground"}`}
											>
												{format(day, "d")}
											</span>
											{items.length ? (
												<span className="text-[10px] text-muted-foreground">
													{items.length}
												</span>
											) : null}
										</div>
										<div className="max-h-28 space-y-1 overflow-y-auto">
											{items.map((item) => (
												<button
													key={item.id}
													type="button"
													onClick={() =>
														setParams({
															openCustomerServiceOverviewId: item.id,
														})
													}
													className="block w-full truncate rounded-md bg-blue-50 px-2 py-1 text-left text-[11px] text-blue-900 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-blue-950/50 dark:text-blue-100"
												>
													{item.scheduleTime ? `${item.scheduleTime} · ` : ""}
													{item.homeOwner ||
														item.projectName ||
														`Work order ${item.id}`}
												</button>
											))}
										</div>
									</div>
								);
							})}
						</div>
					</div>
					<div className="space-y-3 md:hidden">
						{period.days
							.filter((day) => byDate.has(format(day, "yyyy-MM-dd")))
							.map((day) => (
								<div
									key={day.toISOString()}
									className="rounded-xl border bg-card p-3"
								>
									<h3 className="mb-2 text-sm font-semibold">
										{format(day, "EEEE, MMM d")}
									</h3>
									<div className="space-y-2">
										{(byDate.get(format(day, "yyyy-MM-dd")) ?? []).map(
											(item) => (
												<button
													key={item.id}
													type="button"
													onClick={() =>
														setParams({
															openCustomerServiceOverviewId: item.id,
														})
													}
													className="block w-full rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3 text-left dark:bg-blue-950/40"
												>
													<span className="block text-sm font-medium">
														{item.homeOwner ||
															item.projectName ||
															`Work order ${item.id}`}
													</span>
													<span className="block text-xs text-muted-foreground">
														{item.scheduleTime || "Time not set"} ·{" "}
														{item.projectName || "No project"}
													</span>
												</button>
											),
										)}
									</div>
								</div>
							))}
						{data?.length === 0 ? (
							<div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
								No appointments in this {view}.
							</div>
						) : null}
					</div>
				</>
			) : null}
		</section>
	);
}
