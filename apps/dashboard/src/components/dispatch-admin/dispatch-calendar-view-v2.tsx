"use client";

import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Skeleton } from "@gnd/ui/skeleton";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	addDays,
	format,
	isPast,
	isSameDay,
	isToday,
	startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type CalendarRow = {
	id: number;
	status: string | null;
	dueDate: Date | string | null;
	deliveryMode: string | null;
	driver?: { name: string | null } | null;
	order?: {
		orderId?: string | null;
		customer?: { name?: string | null; businessName?: string | null } | null;
	} | null;
	workspace?: { label: string; isTerminal: boolean };
};

function DispatchChip({ item }: { item: CalendarRow }) {
	const { setFilters } = useDispatchFilterParams();
	const customer =
		item.order?.customer?.businessName ||
		item.order?.customer?.name ||
		"Unknown customer";
	const overdue = Boolean(
		item.dueDate &&
			isPast(new Date(item.dueDate)) &&
			!item.workspace?.isTerminal,
	);
	return (
		<button
			type="button"
			className={cn(
				"flex w-full flex-col gap-1 rounded-lg border bg-card p-2 text-left transition-colors hover:bg-muted/50",
				overdue && "border-destructive",
			)}
			onClick={() =>
				setFilters({
					dispatchId: item.id,
					sheetMode: "details",
					detailTab: "overview",
				})
			}
		>
			<div className="flex items-start justify-between gap-2">
				<span className="truncate font-mono text-xs font-semibold">
					{item.order?.orderId || `#${item.id}`}
				</span>
				{overdue ? <Badge variant="destructive">Overdue</Badge> : null}
			</div>
			<span className="truncate text-xs text-muted-foreground">{customer}</span>
			<div className="flex items-center justify-between gap-2">
				<Badge variant="outline">
					{item.workspace?.label || item.status || "Queued"}
				</Badge>
				<span className="truncate text-xs text-muted-foreground">
					{item.driver?.name || "Unassigned"}
				</span>
			</div>
		</button>
	);
}

export function DispatchCalendarView() {
	const trpc = useTRPC();
	const { filters } = useDispatchFilterParams();
	const [weekOffset, setWeekOffset] = useState(0);
	const start = addDays(startOfDay(new Date()), weekOffset * 7);
	const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
	const firstDay = days.at(0) ?? start;
	const lastDay = days.at(-1) ?? start;
	const query = useSuspenseInfiniteQuery(
		trpc.dispatch.calendar.infiniteQueryOptions(
			{
				section: "calendar",
				q: filters.q,
				stages: filters.stages,
				driversId: filters.driversId,
				dueBuckets: filters.dueBuckets,
				deliveryModes: filters.deliveryModes,
				risks: filters.risks,
				size: 500,
			},
			{
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			},
		),
	);
	const rows = useMemo(
		() => query.data.pages.flatMap((page) => page.data) as CalendarRow[],
		[query.data.pages],
	);
	const unscheduled = rows.filter(
		(row) => !row.dueDate && !row.workspace?.isTerminal,
	);
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						aria-label="Previous week"
						onClick={() => setWeekOffset((value) => value - 1)}
					>
						<ChevronLeft />
					</Button>
					<span className="text-sm font-medium">
						{format(firstDay, "MMM d")} – {format(lastDay, "MMM d, yyyy")}
					</span>
					<Button
						variant="outline"
						size="icon"
						aria-label="Next week"
						onClick={() => setWeekOffset((value) => value + 1)}
					>
						<ChevronRight />
					</Button>
					{weekOffset ? (
						<Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
							Today
						</Button>
					) : null}
				</div>
				{unscheduled.length ? (
					<Badge variant="outline">{unscheduled.length} unscheduled</Badge>
				) : null}
			</div>
			<div className="grid min-w-[980px] grid-cols-7 overflow-hidden rounded-xl border">
				{days.map((day) => {
					const items = rows.filter(
						(row) => row.dueDate && isSameDay(new Date(row.dueDate), day),
					);
					return (
						<div
							key={day.toISOString()}
							className={cn(
								"min-h-[420px] border-r last:border-r-0",
								isToday(day) && "bg-muted/30",
							)}
						>
							<div className="border-b p-3 text-center">
								<p className="text-xs text-muted-foreground">
									{format(day, "EEE")}
								</p>
								<p className="text-lg font-semibold">{format(day, "d")}</p>
								<p className="text-xs text-muted-foreground">
									{format(day, "MMM")}
								</p>
							</div>
							<div className="flex flex-col gap-2 p-2">
								{items.map((item) => (
									<DispatchChip key={item.id} item={item} />
								))}
								{items.length === 0 ? (
									<p className="py-8 text-center text-xs text-muted-foreground">
										No dispatches
									</p>
								) : null}
							</div>
						</div>
					);
				})}
			</div>
			{unscheduled.length ? (
				<Card>
					<CardHeader>
						<CardTitle>Unscheduled</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
						{unscheduled.map((item) => (
							<DispatchChip key={item.id} item={item} />
						))}
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}

export function DispatchCalendarSkeleton() {
	return <Skeleton className="h-[520px] rounded-xl" />;
}

