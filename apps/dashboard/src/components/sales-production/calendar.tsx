"use client";

import { OperationsCalendarPeriodPicker } from "@/components/operations-calendar/period-picker";
import {
	type OperationsCalendarView,
	getOperationsCalendarPeriod,
	isOperationsCalendarDatePastDue,
	moveOperationsCalendarDate,
	resolveOperationsCalendarDate,
} from "@/components/operations-calendar/range";
import { SalesPriorityBadge } from "@/components/sales-priority-control";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Skeleton } from "@gnd/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format, isPast, isSameMonth, isToday, startOfDay } from "date-fns";

type ProductionCalendarItem =
	RouterOutputs["sales"]["productionCalendar"]["scheduled"][number];

const STATUS_COLORS: Record<string, string> = {
	unassigned:
		"bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300",
	assigned:
		"bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300",
	"in progress":
		"bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
	completed:
		"bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
};

const LEGEND_STATUSES = ["unassigned", "assigned", "in progress", "completed"];
const CALENDAR_SKELETON_KEYS = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
];

function ProductionChip({
	item,
	compact = false,
	workerMode = false,
}: {
	item: ProductionCalendarItem;
	compact?: boolean;
	workerMode?: boolean;
}) {
	const overview = useSalesOverviewQuery();
	const colorClass = STATUS_COLORS[item.status] ?? STATUS_COLORS.assigned;
	const isOverdue =
		item.status !== "completed" && item.dueDate
			? isOperationsCalendarDatePastDue(new Date(item.dueDate))
			: false;

	return (
		<button
			type="button"
			className={cn(
				"w-full truncate rounded border text-left text-xs transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				compact ? "px-1.5 py-1" : "px-2 py-1.5",
				colorClass,
				isOverdue && "ring-1 ring-red-400",
			)}
			onClick={() =>
				overview.open2(
					item.orderNo,
					workerMode ? "production-tasks" : "sales-production",
				)
			}
			title={`${item.orderNo} · ${item.customer}`}
		>
			<div className="flex min-w-0 items-center justify-between gap-1">
				<span className="truncate font-mono font-semibold uppercase">
					{item.orderNo}
				</span>
				{compact ? null : <SalesPriorityBadge priority={item.priority} />}
			</div>
			{compact ? null : (
				<>
					<div className="truncate opacity-70">{item.customer}</div>
					<div className="truncate opacity-60">
						{item.assignedTo || "Unassigned"} · {item.assignmentCount}{" "}
						{item.assignmentCount === 1 ? "assignment" : "assignments"}
					</div>
				</>
			)}
		</button>
	);
}

function DayColumn({
	date,
	items,
	workerMode,
}: {
	date: Date;
	items: ProductionCalendarItem[];
	workerMode?: boolean;
}) {
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
				<div className="text-xs text-muted-foreground">
					{format(date, "EEE")}
				</div>
				<div
					className={cn(
						"text-lg font-bold leading-none tabular-nums",
						today && "text-blue-600 dark:text-blue-400",
					)}
				>
					{format(date, "d")}
				</div>
				<div className="text-xs text-muted-foreground">
					{format(date, "MMM")}
				</div>
				{items.length > 0 ? (
					<Badge
						variant={today ? "default" : "secondary"}
						className="mt-1 px-1.5 text-xs"
					>
						{items.length}
					</Badge>
				) : null}
			</div>
			<div className="flex flex-1 flex-col gap-1 p-1.5">
				{items.map((item) => (
					<ProductionChip key={item.id} item={item} workerMode={workerMode} />
				))}
				{items.length === 0 ? (
					<div className="flex flex-1 items-center justify-center">
						<span className="text-xs text-muted-foreground/50">
							No production
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

function MonthDayCell({
	date,
	items,
	anchorDate,
	workerMode,
}: {
	date: Date;
	items: ProductionCalendarItem[];
	anchorDate: Date;
	workerMode?: boolean;
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
				{items.length > 0 ? (
					<span className="text-[10px] text-muted-foreground">
						{items.length}
					</span>
				) : null}
			</div>
			<div className="space-y-1">
				{visibleItems.map((item) => (
					<ProductionChip
						key={item.id}
						item={item}
						compact
						workerMode={workerMode}
					/>
				))}
				{overflowItems.length > 0 ? (
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
								<ProductionChip
									key={item.id}
									item={item}
									workerMode={workerMode}
								/>
							))}
						</PopoverContent>
					</Popover>
				) : null}
			</div>
		</div>
	);
}

function groupByDay(items: ProductionCalendarItem[], days: Date[]) {
	const grouped = new Map<string, ProductionCalendarItem[]>();
	for (const day of days) grouped.set(format(day, "yyyy-MM-dd"), []);
	for (const item of items) {
		if (!item.dueDate) continue;
		const key = format(new Date(item.dueDate), "yyyy-MM-dd");
		grouped.get(key)?.push(item);
	}
	return grouped;
}

export function SalesProductionCalendar({
	workerMode = false,
}: {
	workerMode?: boolean;
}) {
	const trpc = useTRPC();
	const { filters, setFilters } = useSalesProductionFilterParams();
	const calendarView = filters.calendarView;
	const anchorDate = resolveOperationsCalendarDate(
		filters.calendarDate || filters.date,
	);
	const period = getOperationsCalendarPeriod(anchorDate, calendarView);
	const queryOptions = workerMode
		? trpc.sales.productionCalendarTasks.queryOptions(
				{
					from: period.from,
					to: period.to,
					q: filters.q,
					priority: filters.priority,
				},
				{ refetchOnWindowFocus: false, staleTime: 60 * 1000 },
			)
		: trpc.sales.productionCalendar.queryOptions(
				{
					from: period.from,
					to: period.to,
					q: filters.q,
					assignedToId: filters.assignedToId,
					priority: filters.priority,
				},
				{ refetchOnWindowFocus: false, staleTime: 60 * 1000 },
			);
	const { data } = useSuspenseQuery(queryOptions);
	const grouped = groupByDay(data.scheduled, period.days);
	const isCurrentPeriod = period.days.some(isToday);

	function setCalendarDate(date: Date) {
		void setFilters({ calendarDate: format(date, "yyyy-MM-dd") });
	}

	function setCalendarView(view: string) {
		void setFilters({ calendarView: view as OperationsCalendarView });
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							setCalendarDate(
								moveOperationsCalendarDate(anchorDate, calendarView, -1),
							)
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
							setCalendarDate(
								moveOperationsCalendarDate(anchorDate, calendarView, 1),
							)
						}
						aria-label={`Next ${calendarView}`}
					>
						<Icons.ChevronRight size={14} />
					</Button>
					{isCurrentPeriod ? null : (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setCalendarDate(new Date())}
						>
							Today
						</Button>
					)}
				</div>

				<div className="flex items-center gap-3">
					<div className="hidden items-center gap-3 text-xs xl:flex">
						{LEGEND_STATUSES.map((status) => (
							<div key={status} className="flex items-center gap-1">
								<div
									className={cn(
										"size-2.5 rounded border",
										STATUS_COLORS[status],
									)}
								/>
								<span className="capitalize text-muted-foreground">
									{status}
								</span>
							</div>
						))}
					</div>
					<Tabs value={calendarView} onValueChange={setCalendarView}>
						<TabsList className="min-h-9 rounded-md p-0.5 max-lg:border max-lg:bg-muted/60">
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
								workerMode={workerMode}
							/>
						))}
					</div>
				) : (
					<div className="min-w-[980px]">
						<div className="grid grid-cols-7 border-b bg-muted/30">
							{period.days.slice(0, 7).map((day) => (
								<div
									key={day.toISOString()}
									className="p-2 text-center text-xs font-medium text-muted-foreground"
								>
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
									workerMode={workerMode}
								/>
							))}
						</div>
					</div>
				)}
			</Card>
		</div>
	);
}

export function SalesProductionCalendarSkeleton() {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="grid grid-cols-7 gap-2">
					{CALENDAR_SKELETON_KEYS.map((key) => (
						<Skeleton key={key} className="h-64 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}
