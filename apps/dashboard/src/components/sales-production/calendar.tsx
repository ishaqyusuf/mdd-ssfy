"use client";

import {
	CalendarScheduleMoveDialog,
	type CalendarScheduleMoveProposal,
} from "@/components/calendar-schedule-move-dialog";
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
import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	closestCenter,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Skeleton } from "@gnd/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { format, isPast, isSameMonth, isToday, startOfDay } from "date-fns";
import { useState } from "react";

type ProductionCalendarItem =
	RouterOutputs["sales"]["productionCalendar"]["scheduled"][number];
type ProductionMoveProposal = CalendarScheduleMoveProposal & {
	item: ProductionCalendarItem;
};

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
	onReschedule,
}: {
	item: ProductionCalendarItem;
	compact?: boolean;
	workerMode?: boolean;
	onReschedule?: (item: ProductionCalendarItem) => void;
}) {
	const overview = useSalesOverviewQuery();
	const draggable = useDraggable({
		id: `production:${item.orderId}:${item.sourceDate || item.id}`,
		data: { item },
		disabled: workerMode || !item.canReschedule,
	});
	const colorClass = STATUS_COLORS[item.status] ?? STATUS_COLORS.assigned;
	const isOverdue =
		item.status !== "completed" && item.dueDate
			? isOperationsCalendarDatePastDue(new Date(item.dueDate))
			: false;

	return (
		<div
			ref={draggable.setNodeRef}
			style={{
				transform: CSS.Translate.toString(draggable.transform),
				opacity: draggable.isDragging ? 0.35 : undefined,
			}}
			className={cn(
				"flex w-full min-w-0 items-start rounded border text-left text-xs transition-opacity focus-within:ring-2 focus-within:ring-ring hover:opacity-90",
				compact ? "px-1.5 py-1" : "px-2 py-1.5",
				colorClass,
				isOverdue && "ring-1 ring-red-400",
			)}
			title={`${item.orderNo} · ${item.customer}`}
		>
			<button
				type="button"
				className="min-w-0 flex-1 text-left focus-visible:outline-none"
				onClick={() =>
					overview.open2(
						item.orderNo,
						workerMode ? "production-tasks" : "sales-production",
					)
				}
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
			{workerMode ? null : item.canReschedule ? (
				<div className="ml-1 flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						className="rounded px-1 font-semibold opacity-70 hover:bg-background/50 hover:opacity-100 focus-visible:outline-none"
						onClick={() => onReschedule?.(item)}
						aria-label={`Reschedule ${item.orderNo}`}
						title="Reschedule"
					>
						↗
					</button>
					<button
						type="button"
						ref={draggable.setActivatorNodeRef}
						{...draggable.listeners}
						{...draggable.attributes}
						className="cursor-grab rounded px-1 font-semibold opacity-70 hover:bg-background/50 hover:opacity-100 focus-visible:outline-none active:cursor-grabbing"
						aria-label={`Drag ${item.orderNo} to another production date`}
						title="Drag to reschedule"
					>
						⠿
					</button>
				</div>
			) : (
				<span
					className="ml-1 shrink-0 px-1 opacity-60"
					title={item.rescheduleLockReason || "Schedule locked"}
					aria-label={item.rescheduleLockReason || "Schedule locked"}
				>
					🔒
				</span>
			)}
		</div>
	);
}

function DayColumn({
	date,
	items,
	workerMode,
	onReschedule,
}: {
	date: Date;
	items: ProductionCalendarItem[];
	workerMode?: boolean;
	onReschedule?: (item: ProductionCalendarItem) => void;
}) {
	const today = isToday(date);
	const past = isPast(startOfDay(date)) && !today;
	const dateKey = format(date, "yyyy-MM-dd");
	const droppable = useDroppable({
		id: `production-date:${dateKey}`,
		data: { date: dateKey },
		disabled: workerMode,
	});

	return (
		<div
			ref={droppable.setNodeRef}
			className={cn(
				"flex min-h-[300px] flex-col border-r last:border-r-0",
				today && "bg-blue-50/50 dark:bg-blue-950/20",
				droppable.isOver && "bg-primary/10 ring-2 ring-inset ring-primary",
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
					<ProductionChip
						key={item.id}
						item={item}
						workerMode={workerMode}
						onReschedule={onReschedule}
					/>
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
	onReschedule,
}: {
	date: Date;
	items: ProductionCalendarItem[];
	anchorDate: Date;
	workerMode?: boolean;
	onReschedule?: (item: ProductionCalendarItem) => void;
}) {
	const visibleItems = items.slice(0, 3);
	const overflowItems = items.slice(3);
	const dateKey = format(date, "yyyy-MM-dd");
	const droppable = useDroppable({
		id: `production-date:${dateKey}`,
		data: { date: dateKey },
		disabled: workerMode,
	});

	return (
		<div
			ref={droppable.setNodeRef}
			className={cn(
				"min-h-32 border-b border-r p-1.5",
				!isSameMonth(date, anchorDate) && "bg-muted/20 text-muted-foreground",
				isToday(date) && "bg-blue-50/70 dark:bg-blue-950/20",
				droppable.isOver && "bg-primary/10 ring-2 ring-inset ring-primary",
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
						onReschedule={onReschedule}
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
									onReschedule={onReschedule}
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
	const [moveProposal, setMoveProposal] =
		useState<ProductionMoveProposal | null>(null);
	const [activeItem, setActiveItem] = useState<ProductionCalendarItem | null>(
		null,
	);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 180, tolerance: 8 },
		}),
		useSensor(KeyboardSensor),
	);
	const moveSchedule = useMutation(
		trpc.sales.moveProductionSchedule.mutationOptions({
			onSuccess: (result) => {
				setMoveProposal(null);
				toast({
					title: "Production schedule moved.",
					description: result.notificationFailed
						? "The date was saved, but the worker notification could not be delivered."
						: `${result.affectedRecordCount} ${result.affectedRecordCount === 1 ? "assignment" : "assignments"} moved to ${result.targetDate}.`,
				});
			},
			onError: (error) => {
				toast({
					variant: "destructive",
					title: "Production schedule was not moved.",
					description: error.message,
				});
			},
		}),
	);
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
					scope: "all",
					q: filters.q,
					priority: filters.priority,
				},
				{ refetchOnWindowFocus: false, staleTime: 60 * 1000 },
			)
		: trpc.sales.productionCalendar.queryOptions(
				{
					from: period.from,
					to: period.to,
					scope: "all",
					q: filters.q,
					assignedToId: filters.assignedToId,
					priority: filters.priority,
				},
				{ refetchOnWindowFocus: false, staleTime: 60 * 1000 },
			);
	const { data } = useSuspenseQuery(queryOptions);
	const grouped = groupByDay(data.scheduled, period.days);
	const isCurrentPeriod = period.days.some((day) => isToday(day));

	function setCalendarDate(date: Date) {
		void setFilters({ calendarDate: format(date, "yyyy-MM-dd") });
	}

	function setCalendarView(view: string) {
		void setFilters({ calendarView: view as OperationsCalendarView });
	}

	function proposeMove(item: ProductionCalendarItem, targetDate?: string) {
		if (
			workerMode ||
			!item.canReschedule ||
			!item.sourceDate ||
			!item.expectedEvidenceRevision
		) {
			return;
		}
		setMoveProposal({
			kind: "production",
			orderNo: item.orderNo,
			customer: item.customer,
			sourceDate: item.sourceDate,
			targetDate: targetDate || item.sourceDate,
			affectedRecordCount: item.assignmentCount,
			item,
		});
	}

	function handleDragStart(event: DragStartEvent) {
		const item = event.active.data.current?.item as
			| ProductionCalendarItem
			| undefined;
		setActiveItem(item || null);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveItem(null);
		const item = event.active.data.current?.item as
			| ProductionCalendarItem
			| undefined;
		const targetDate = event.over?.data.current?.date as string | undefined;
		if (!item || !targetDate || targetDate === item.sourceDate) return;
		proposeMove(item, targetDate);
	}

	function confirmMove(targetDate: string) {
		const proposal = moveProposal;
		if (
			!proposal ||
			!proposal.item.sourceDate ||
			!proposal.item.expectedEvidenceRevision ||
			targetDate === proposal.item.sourceDate
		) {
			return;
		}
		moveSchedule.mutate({
			requestId: crypto.randomUUID(),
			salesOrderId: proposal.item.orderId,
			sourceDate: proposal.item.sourceDate,
			targetDate,
			expectedRevision: proposal.item.expectedEvidenceRevision,
		});
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={() => setActiveItem(null)}
		>
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
								<TabsTrigger
									value="month"
									className="min-h-8 rounded px-3 py-1"
								>
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
									onReschedule={proposeMove}
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
										onReschedule={proposeMove}
									/>
								))}
							</div>
						</div>
					)}
				</Card>
				<CalendarScheduleMoveDialog
					proposal={moveProposal}
					pending={moveSchedule.isPending}
					onClose={() => setMoveProposal(null)}
					onConfirm={confirmMove}
				/>
				<DragOverlay>
					{activeItem ? (
						<div className="max-w-64 rounded border border-primary bg-background px-3 py-2 text-xs shadow-lg">
							<p className="font-mono font-semibold uppercase">
								{activeItem.orderNo}
							</p>
							<p className="truncate text-muted-foreground">
								{activeItem.customer}
							</p>
						</div>
					) : null}
				</DragOverlay>
			</div>
		</DndContext>
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
