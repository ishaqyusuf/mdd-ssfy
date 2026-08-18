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
import { Calendar } from "@gnd/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import dayjs from "@gnd/utils/dayjs";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function SalesProductionCalendar() {
	const trpc = useTRPC();
	const { filters, setFilters } = useSalesProductionFilterParams();
	const overviewQuery = useSalesOverviewQuery();
	const [month, setMonth] = useState(() =>
		dayjs(filters.date || undefined)
			.startOf("month")
			.toDate(),
	);

	useEffect(() => {
		if (filters.date) {
			setMonth(dayjs(filters.date).startOf("month").toDate());
		}
	}, [filters.date]);

	const anchor = dayjs(month);
	const from = anchor.startOf("month").format("YYYY-MM-DD");
	const to = anchor.endOf("month").format("YYYY-MM-DD");
	const { data } = useSuspenseQuery(
		trpc.sales.productionCalendar.queryOptions({
			from,
			to,
			q: filters.q,
			assignedToId: filters.assignedToId,
			priority: filters.priority,
		}),
	);
	const selectedDate = filters.date
		? new Date(`${filters.date}T00:00:00`)
		: undefined;
	const activeDays = data
		.filter((item) => item.count > 0)
		.map((item) => new Date(`${item.date}T00:00:00`));
	const selected = data.find((item) => item.date === filters.date);
	const scheduledDays = data.filter((item) => item.count > 0).slice(0, 10);
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
		<Card className="overflow-hidden rounded-xl shadow-sm">
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 px-3 pt-3 sm:px-4 sm:pt-4">
				<div className="flex flex-col gap-1">
					<CardTitle>Production calendar</CardTitle>
					<CardDescription>
						Select a date to inspect its production load.
					</CardDescription>
				</div>
				{selected ? (
					<Button
						size="sm"
						className="h-9"
						onClick={() =>
							setFilters({ tab: "queue", view: "table", date: selected.date })
						}
					>
						View queue
					</Button>
				) : null}
			</CardHeader>
			<CardContent className="grid gap-4 px-3 pb-3 sm:px-4 sm:pb-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
				<Calendar
					mode="single"
					selected={selectedDate}
					month={month}
					onMonthChange={setMonth}
					onSelect={(date) =>
						setFilters({
							tab: "queue",
							view: "calendar",
							date: date ? dayjs(date).format("YYYY-MM-DD") : null,
						})
					}
					modifiers={{ hasDue: activeDays }}
					modifiersClassNames={{
						hasDue:
							"rounded-md border border-foreground/20 bg-muted font-semibold",
					}}
					className="mx-auto rounded-lg border"
				/>
				<div className="flex min-w-0 flex-col gap-3">
					{selected ? (
						<Card className="overflow-hidden rounded-lg shadow-none">
							<CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
								<div className="flex flex-col gap-1">
									<CardTitle className="text-sm">{selected.label}</CardTitle>
									<CardDescription>
										{selected.count} assignment{selected.count === 1 ? "" : "s"}{" "}
										due
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
										No production orders match this date and the current
										filters.
									</p>
								)}
							</CardContent>
						</Card>
					) : scheduledDays.length > 0 ? (
						<div className="grid gap-2 sm:grid-cols-2">
							{scheduledDays.map((item) => (
								<Button
									key={item.date}
									type="button"
									variant="outline"
									onClick={() =>
										setFilters({
											tab: "queue",
											view: "calendar",
											date: item.date,
										})
									}
									className="h-11 justify-between px-3"
								>
									<span className="truncate text-sm font-medium">
										{item.label}
									</span>
									<Badge variant="secondary">{item.count}</Badge>
								</Button>
							))}
						</div>
					) : (
						<Card className="shadow-none">
							<CardContent className="flex min-h-28 flex-col items-center justify-center gap-1 p-4 text-center">
								<p className="text-sm font-medium">No scheduled production</p>
								<p className="text-sm text-muted-foreground">
									This month has no assignments matching the current filters.
								</p>
							</CardContent>
						</Card>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
