"use client";

import {
	type FulfillmentCalendarView,
	getFulfillmentCalendarPeriod,
	moveFulfillmentCalendarDate,
	resolveFulfillmentCalendarDate,
} from "@/components/dispatch-admin/fulfillment-calendar-range";
import { OperationsCalendarPeriodPicker } from "@/components/operations-calendar/period-picker";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@gnd/ui/popover";
import { Skeleton } from "@gnd/ui/skeleton";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import {
	format,
	isPast,
	isSameMonth,
	isToday,
	startOfDay,
} from "date-fns";

type DispatchItem = {
	id: number;
	status: string | null;
	dueDate: Date | string | null;
	deliveryMode: string | null;
	driver?: { name: string | null } | null;
	order?: {
		orderId?: string | null;
		customer?: {
			name?: string | null;
			businessName?: string | null;
		} | null;
	} | null;
};

const STATUS_COLORS: Record<string, string> = {
	queue:
		"bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300",
	"packing queue":
		"bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
	packed:
		"bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300",
	"in progress":
		"bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
	"missing items":
		"bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300",
};

const LEGEND_STATUSES = ["queue", "packed", "in progress", "missing items"];

function DispatchChip({
	item,
	compact = false,
}: {
	item: DispatchItem;
	compact?: boolean;
}) {
	const overview = useSalesOverviewQuery();
	const customer =
		item.order?.customer?.businessName ||
		item.order?.customer?.name ||
		"Unknown";
	const orderNo = item.order?.orderId ?? `#${item.id}`;
	const colorClass = STATUS_COLORS[item.status ?? "queue"] ?? STATUS_COLORS.queue;
	const isOverdue = item.dueDate && isPast(new Date(item.dueDate));

	return (
		<button
			type="button"
			className={cn(
				"w-full truncate rounded border text-left text-xs transition-opacity hover:opacity-80",
				compact ? "px-1.5 py-1" : "px-2 py-1.5",
				colorClass,
				isOverdue && "ring-1 ring-red-400",
			)}
			onClick={() =>
				overview.openDispatch(item.order?.orderId ?? undefined, item.id, "packing")
			}
			title={`${orderNo} · ${customer}`}
		>
			<div className="truncate font-medium">{orderNo}</div>
			{!compact && (
				<>
					<div className="truncate opacity-70">{customer}</div>
					{item.driver?.name && (
						<div className="truncate opacity-60">{item.driver.name}</div>
					)}
				</>
			)}
		</button>
	);
}

function DayColumn({ date, items }: { date: Date; items: DispatchItem[] }) {
	const today = isToday(date);
	const past = isPast(startOfDay(date)) && !today;

	return (
		<div
			className={cn(
				"flex min-h-[300px] flex-col border-r last:border-r-0",
				today && "bg-blue-50/50 dark:bg-blue-950/20",
			)}
		>
			<div
				className={cn(
					"sticky top-0 z-10 border-b px-2 py-2 text-center",
					today ? "bg-blue-100 dark:bg-blue-900/50" : "bg-muted/30",
					past && "opacity-60",
				)}
			>
				<div className="text-xs text-muted-foreground">{format(date, "EEE")}</div>
				<div
					className={cn(
						"text-lg font-bold leading-none tabular-nums",
						today && "text-blue-600 dark:text-blue-400",
					)}
				>
					{format(date, "d")}
				</div>
				<div className="text-xs text-muted-foreground">{format(date, "MMM")}</div>
				{items.length > 0 && (
					<Badge
						variant={today ? "default" : "secondary"}
						className="mt-1 px-1.5 text-xs"
					>
						{items.length}
					</Badge>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-1 p-1.5">
				{items.map((item) => (
					<DispatchChip key={item.id} item={item} />
				))}
				{items.length === 0 && (
					<div className="flex flex-1 items-center justify-center">
						<span className="text-xs text-muted-foreground/50">No dispatches</span>
					</div>
				)}
			</div>
		</div>
	);
}

function MonthDayCell({
	date,
	items,
	anchorDate,
}: {
	date: Date;
	items: DispatchItem[];
	anchorDate: Date;
}) {
	const visibleItems = items.slice(0, 3);
	const overflowItems = items.slice(3);

	return (
		<div
			className={cn(
				"min-h-32 border-b border-r p-1.5",
				!isSameMonth(date, anchorDate) && "bg-muted/20 text-muted-foreground",
				isToday(date) && "bg-blue-50/70 dark:bg-blue-950/20",
			)}
		>
			<div className="mb-1 flex items-center justify-between">
				<span
					className={cn(
						"flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
						isToday(date) && "bg-primary text-primary-foreground",
					)}
				>
					{format(date, "d")}
				</span>
				{items.length > 0 && (
					<span className="text-[10px] text-muted-foreground">{items.length}</span>
				)}
			</div>
			<div className="space-y-1">
				{visibleItems.map((item) => (
					<DispatchChip key={item.id} item={item} compact />
				))}
				{overflowItems.length > 0 && (
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="sm" className="h-6 w-full text-xs">
								+{overflowItems.length} more
							</Button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-64 space-y-1 p-2">
							<p className="px-1 pb-1 text-xs font-medium">
								{format(date, "EEEE, MMMM d")}
							</p>
							{overflowItems.map((item) => (
								<DispatchChip key={item.id} item={item} />
							))}
						</PopoverContent>
					</Popover>
				)}
			</div>
		</div>
	);
}

function groupByDay(items: DispatchItem[], days: Date[]) {
	const map = new Map<string, DispatchItem[]>();
	for (const day of days) map.set(format(day, "yyyy-MM-dd"), []);
	for (const item of items) {
		if (!item.dueDate) continue;
		const key = format(new Date(item.dueDate), "yyyy-MM-dd");
		map.get(key)?.push(item);
	}
	return map;
}

export function DispatchCalendarView() {
	const trpc = useTRPC();
	const { filters, setFilters } = useDispatchFilterParams();
	const calendarView = filters.calendarView;
	const anchorDate = resolveFulfillmentCalendarDate(filters.calendarDate);
	const period = getFulfillmentCalendarPeriod(anchorDate, calendarView);
	const { data } = useSuspenseQuery(
		trpc.dispatch.fulfillmentCalendar.queryOptions(
			{ from: period.from, to: period.to },
			{ refetchOnWindowFocus: false, staleTime: 60 * 1000 },
		),
	);
	const grouped = groupByDay(data.scheduled, period.days);
	const isCurrentPeriod = period.days.some(isToday);

	function setCalendarDate(date: Date) {
		void setFilters({ calendarDate: format(date, "yyyy-MM-dd") });
	}

	function setCalendarView(view: string) {
		void setFilters({ calendarView: view as FulfillmentCalendarView });
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							setCalendarDate(moveFulfillmentCalendarDate(anchorDate, calendarView, -1))
						}
						aria-label={`Previous ${calendarView}`}
					>
						<Icons.ChevronLeft size={14} />
					</Button>
					<OperationsCalendarPeriodPicker
						date={anchorDate}
						view={calendarView}
						onSelect={setCalendarDate}
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							setCalendarDate(moveFulfillmentCalendarDate(anchorDate, calendarView, 1))
						}
						aria-label={`Next ${calendarView}`}
					>
						<Icons.ChevronRight size={14} />
					</Button>
					{!isCurrentPeriod && (
						<Button variant="ghost" size="sm" onClick={() => setCalendarDate(new Date())}>
							Today
						</Button>
					)}
				</div>

				<div className="flex items-center gap-3">
					<div className="hidden items-center gap-3 text-xs xl:flex">
						{LEGEND_STATUSES.map((status) => (
							<div key={status} className="flex items-center gap-1">
								<div className={cn("size-2.5 rounded border", STATUS_COLORS[status])} />
								<span className="capitalize text-muted-foreground">{status}</span>
							</div>
						))}
					</div>
					<Tabs value={calendarView} onValueChange={setCalendarView}>
						<TabsList className="min-h-9 rounded-md p-0.5 max-lg:rounded-md max-lg:border max-lg:bg-muted/60 max-lg:p-0.5">
							<TabsTrigger value="week" className="min-h-8 rounded px-3 py-1">
								Week
							</TabsTrigger>
							<TabsTrigger value="month" className="min-h-8 rounded px-3 py-1">
								Month
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</div>

			<Card className="overflow-auto">
				{calendarView === "week" ? (
					<div className="grid min-w-[980px] grid-cols-7 divide-x">
						{period.days.map((day) => (
							<DayColumn
								key={day.toISOString()}
								date={day}
								items={grouped.get(format(day, "yyyy-MM-dd")) ?? []}
							/>
						))}
					</div>
				) : (
					<div className="min-w-[980px]">
						<div className="grid grid-cols-7 border-b bg-muted/30">
							{period.days.slice(0, 7).map((day) => (
								<div key={day.toISOString()} className="p-2 text-center text-xs font-medium text-muted-foreground">
									{format(day, "EEE")}
								</div>
							))}
						</div>
						<div className="grid grid-cols-7 border-l">
							{period.days.map((day) => (
								<MonthDayCell
									key={day.toISOString()}
									date={day}
									anchorDate={anchorDate}
									items={grouped.get(format(day, "yyyy-MM-dd")) ?? []}
								/>
							))}
						</div>
					</div>
				)}
			</Card>

			{data.unscheduled.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm">
							<Icons.Clock size={14} className="text-muted-foreground" />
							Unscheduled ({data.unscheduled.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
							{data.unscheduled.map((item) => (
								<DispatchChip key={item.id} item={item} />
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

export function DispatchCalendarSkeleton() {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="grid grid-cols-7 gap-2">
					{Array.from({ length: 7 }).map((_, index) => (
						<Skeleton key={index} className="h-64 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}
