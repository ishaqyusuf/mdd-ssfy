"use client";

import { SalesPriorityBadge } from "@/components/sales-priority-control";
import {
	type SalesProductionRow,
	getSalesProductionRowId,
} from "@/components/tables-2/sales-production/columns";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Skeleton } from "@gnd/ui/skeleton";
import dayjs from "@gnd/utils/dayjs";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export function SalesProductionCalendar() {
	const trpc = useTRPC();
	const { filters, setFilters } = useSalesProductionFilterParams();
	const overviewQuery = useSalesOverviewQuery();
	const [weekStart, setWeekStart] = useState(() =>
		dayjs(filters.date || undefined).startOf("day"),
	);

	useEffect(() => {
		if (filters.date) setWeekStart(dayjs(filters.date).startOf("day"));
	}, [filters.date]);

	const weekDays = Array.from({ length: 7 }, (_, index) =>
		weekStart.add(index, "day"),
	);
	const firstDay = weekDays[0]!;
	const lastDay = weekDays.at(-1)!;
	const { data } = useSuspenseQuery(
		trpc.sales.productionCalendar.queryOptions({
			from: firstDay.format("YYYY-MM-DD"),
			to: lastDay.format("YYYY-MM-DD"),
			q: filters.q,
			assignedToId: filters.assignedToId,
			priority: filters.priority,
		}),
	);
	const selected = data.find((item) => item.date === filters.date);
	const agendaQuery = useInfiniteQuery(
		trpc.sales.productions.infiniteQueryOptions(
			{
				production: "pending",
				productionDueDate: filters.date || undefined,
				q: filters.q,
				assignedToId: filters.assignedToId,
				priority: filters.priority,
				size: 10,
			} as RouterInputs["sales"]["productions"],
			{
				enabled: Boolean(selected),
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			},
		),
	);
	const agendaRows =
		(
			agendaQuery.data?.pages as
				| Array<{ data?: SalesProductionRow[] }>
				| undefined
		)?.flatMap((page) => page.data ?? []) ?? [];

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Previous week"
						onClick={() => setWeekStart((value) => value.subtract(7, "day"))}
					>
						<ChevronLeft className="size-4" />
					</Button>
					<span className="text-sm font-medium">
						{firstDay.format("MMM D")} – {lastDay.format("MMM D, YYYY")}
					</span>
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Next week"
						onClick={() => setWeekStart((value) => value.add(7, "day"))}
					>
						<ChevronRight className="size-4" />
					</Button>
					{weekStart.isSame(dayjs(), "day") ? null : (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setWeekStart(dayjs().startOf("day"))}
						>
							Today
						</Button>
					)}
				</div>
				{selected ? (
					<Button
						type="button"
						size="sm"
						className="h-9"
						onClick={() =>
							setFilters({ tab: "queue", view: "table", date: selected.date })
						}
					>
						View queue
					</Button>
				) : null}
			</div>

			<Card className="overflow-hidden rounded-xl shadow-sm">
				<CardHeader className="px-3 pt-3 sm:px-4 sm:pt-4">
					<CardTitle>Production calendar</CardTitle>
					<CardDescription>
						Review this week&apos;s production load, then select a day to
						inspect its agenda.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<div className="grid min-w-[980px] grid-cols-7 divide-x">
							{data.map((item) => {
								const day = dayjs(item.date);
								const isSelected = item.date === filters.date;

								return (
									<button
										key={item.date}
										type="button"
										aria-pressed={isSelected}
										onClick={() =>
											setFilters({
												tab: "queue",
												view: "calendar",
												date: item.date,
											})
										}
										className={cn(
											"min-h-44 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
											item.isToday && "bg-muted/30",
											isSelected && "bg-primary/10",
										)}
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<p className="text-xs text-muted-foreground">
													{day.format("ddd")}
												</p>
												<p className="text-lg font-semibold tabular-nums">
													{day.format("D")}
												</p>
												<p className="text-xs text-muted-foreground">
													{day.format("MMM")}
												</p>
											</div>
											{item.count ? (
												<Badge variant={item.isToday ? "default" : "secondary"}>
													{item.count}
												</Badge>
											) : null}
										</div>
										<p className="mt-8 text-sm text-muted-foreground">
											{item.count
												? `${item.count} production ${item.count === 1 ? "assignment" : "assignments"} due`
												: "No production due"}
										</p>
									</button>
								);
							})}
						</div>
					</div>
				</CardContent>
			</Card>

			{selected ? (
				<Card className="overflow-hidden rounded-xl shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
						<div className="flex flex-col gap-1">
							<CardTitle className="text-sm">{selected.label}</CardTitle>
							<CardDescription>
								{selected.count} assignment{selected.count === 1 ? "" : "s"} due
							</CardDescription>
						</div>
						<Badge variant="secondary">Daily agenda</Badge>
					</CardHeader>
					<CardContent className="p-2">
						{agendaQuery.isFetching && !agendaRows.length ? (
							<div className="grid gap-2 p-2">
								<Skeleton className="h-14 rounded-md" />
								<Skeleton className="h-14 rounded-md" />
								<Skeleton className="h-14 rounded-md" />
							</div>
						) : agendaRows.length ? (
							<div className="flex flex-col gap-1">
								{agendaRows.map((row) => (
									<Button
										key={getSalesProductionRowId(row)}
										type="button"
										variant="ghost"
										onClick={() =>
											overviewQuery.open2(
												getSalesProductionRowId(row),
												"sales-production",
											)
										}
										className="h-auto min-h-14 w-full justify-between gap-3 px-3 py-2 text-left"
									>
										<span className="min-w-0">
											<span className="block truncate font-mono text-sm font-semibold uppercase">
												{row.orderId}
											</span>
											<span className="block truncate text-xs font-normal text-muted-foreground">
												{row.customer || "Customer unavailable"} ·{" "}
												{row.assignedTo || "Unassigned"}
											</span>
										</span>
										<SalesPriorityBadge priority={row.priority} />
									</Button>
								))}
								{agendaQuery.hasNextPage ? (
									<Button
										type="button"
										variant="ghost"
										disabled={agendaQuery.isFetchingNextPage}
										onClick={() => agendaQuery.fetchNextPage()}
										className="mt-1 h-9 w-full"
									>
										{agendaQuery.isFetchingNextPage
											? "Loading..."
											: "Load more"}
									</Button>
								) : null}
							</div>
						) : (
							<p className="p-4 text-center text-sm text-muted-foreground">
								No production orders match this date and the current filters.
							</p>
						)}
					</CardContent>
				</Card>
			) : (
				<Card className="shadow-sm">
					<CardContent className="flex min-h-28 flex-col items-center justify-center gap-1 p-4 text-center">
						<p className="text-sm font-medium">Select a production day</p>
						<p className="text-sm text-muted-foreground">
							Choose any date above to inspect its production assignments.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
