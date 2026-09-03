"use client";

import {
	CalendarScheduleMoveDialog,
	type CalendarScheduleMoveProposal,
} from "@/components/calendar-schedule-move-dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Skeleton } from "@gnd/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { format, isPast, isSameMonth, isToday, startOfDay } from "date-fns";
import { useState } from "react";

type DispatchItem = {
	id: number;
	salesOrderId: number;
	status: string | null;
	dueDate: Date | string | null;
	sourceDate: string | null;
	expectedEvidenceRevision: string | null;
	canReschedule: boolean;
	rescheduleLockReason: string | null;
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
type FulfillmentMoveProposal = CalendarScheduleMoveProposal & {
	item: DispatchItem;
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
const CALENDAR_SKELETON_KEYS = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
];

function DispatchChip({
	item,
	compact = false,
	onReschedule,
}: {
	item: DispatchItem;
	compact?: boolean;
	onReschedule?: (item: DispatchItem) => void;
}) {
	const overview = useSalesOverviewQuery();
	const draggable = useDraggable({
		id: `fulfillment:${item.id}`,
		data: { item },
		disabled: !item.canReschedule,
	});
	const customer =
		item.order?.customer?.businessName ||
		item.order?.customer?.name ||
		"Unknown";
	const orderNo = item.order?.orderId ?? `#${item.id}`;
	const colorClass =
		STATUS_COLORS[item.status ?? "queue"] ?? STATUS_COLORS.queue;
	const isOverdue = item.dueDate && isPast(new Date(item.dueDate));

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
			title={`${orderNo} · ${customer}`}
		>
			<button
				type="button"
				className="min-w-0 flex-1 text-left focus-visible:outline-none"
				onClick={() =>
					overview.openDispatch(
						item.order?.orderId ?? undefined,
						item.id,
						"packing",
					)
				}
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
			{item.canReschedule ? (
				<div className="ml-1 flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						className="rounded px-1 font-semibold opacity-70 hover:bg-background/50 hover:opacity-100 focus-visible:outline-none"
						onClick={() => onReschedule?.(item)}
						aria-label={`Reschedule ${orderNo}`}
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
						aria-label={`Drag ${orderNo} to another fulfillment date`}
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
	onReschedule,
}: {
	date: Date;
	items: DispatchItem[];
	onReschedule?: (item: DispatchItem) => void;
}) {
	const today = isToday(date);
	const past = isPast(startOfDay(date)) && !today;
	const dateKey = format(date, "yyyy-MM-dd");
	const droppable = useDroppable({
		id: `fulfillment-date:${dateKey}`,
		data: { date: dateKey },
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
					<DispatchChip key={item.id} item={item} onReschedule={onReschedule} />
				))}
				{items.length === 0 && (
					<div className="flex flex-1 items-center justify-center">
						<span className="text-xs text-muted-foreground/50">
							No dispatches
						</span>
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
	onReschedule,
}: {
	date: Date;
	items: DispatchItem[];
	anchorDate: Date;
	onReschedule?: (item: DispatchItem) => void;
}) {
	const visibleItems = items.slice(0, 3);
	const overflowItems = items.slice(3);
	const dateKey = format(date, "yyyy-MM-dd");
	const droppable = useDroppable({
		id: `fulfillment-date:${dateKey}`,
		data: { date: dateKey },
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
				{items.length > 0 && (
					<span className="text-[10px] text-muted-foreground">
						{items.length}
					</span>
				)}
			</div>
			<div className="space-y-1">
				{visibleItems.map((item) => (
					<DispatchChip
						key={item.id}
						item={item}
						compact
						onReschedule={onReschedule}
					/>
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
								<DispatchChip
									key={item.id}
									item={item}
									onReschedule={onReschedule}
								/>
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
	const [moveProposal, setMoveProposal] =
		useState<FulfillmentMoveProposal | null>(null);
	const [activeItem, setActiveItem] = useState<DispatchItem | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 180, tolerance: 8 },
		}),
		useSensor(KeyboardSensor),
	);
	const moveSchedule = useMutation(
		trpc.dispatch.moveFulfillmentSchedule.mutationOptions({
			onSuccess: (result) => {
				setMoveProposal(null);
				toast({
					title: "Fulfillment schedule moved.",
					description: result.notificationFailed
						? "The date was saved, but the driver notification could not be delivered."
						: `Fulfillment moved to ${result.targetDate}.`,
				});
			},
			onError: (error) => {
				toast({
					variant: "destructive",
					title: "Fulfillment schedule was not moved.",
					description: error.message,
				});
			},
		}),
	);
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
	const isCurrentPeriod = period.days.some((day) => isToday(day));

	function setCalendarDate(date: Date) {
		void setFilters({ calendarDate: format(date, "yyyy-MM-dd") });
	}

	function setCalendarView(view: string) {
		void setFilters({ calendarView: view as FulfillmentCalendarView });
	}

	function proposeMove(item: DispatchItem, targetDate?: string) {
		if (!item.canReschedule || !item.expectedEvidenceRevision) return;
		const customer =
			item.order?.customer?.businessName ||
			item.order?.customer?.name ||
			"Unknown customer";
		setMoveProposal({
			kind: "fulfillment",
			orderNo: item.order?.orderId || `#${item.id}`,
			customer,
			sourceDate: item.sourceDate,
			targetDate: targetDate || item.sourceDate || "",
			affectedRecordCount: 1,
			item,
		});
	}

	function handleDragStart(event: DragStartEvent) {
		const item = event.active.data.current?.item as DispatchItem | undefined;
		setActiveItem(item || null);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveItem(null);
		const item = event.active.data.current?.item as DispatchItem | undefined;
		const targetDate = event.over?.data.current?.date as string | undefined;
		if (!item || !targetDate || targetDate === item.sourceDate) return;
		proposeMove(item, targetDate);
	}

	function confirmMove(targetDate: string) {
		const proposal = moveProposal;
		if (
			!proposal ||
			!proposal.item.expectedEvidenceRevision ||
			targetDate === proposal.item.sourceDate
		) {
			return;
		}
		moveSchedule.mutate({
			requestId: crypto.randomUUID(),
			dispatchId: proposal.item.id,
			salesOrderId: proposal.item.salesOrderId,
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
									moveFulfillmentCalendarDate(anchorDate, calendarView, -1),
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
									moveFulfillmentCalendarDate(anchorDate, calendarView, 1),
								)
							}
							aria-label={`Next ${calendarView}`}
						>
							<Icons.ChevronRight size={14} />
						</Button>
						{!isCurrentPeriod && (
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
							<TabsList className="min-h-9 rounded-md p-0.5 max-lg:rounded-md max-lg:border max-lg:bg-muted/60 max-lg:p-0.5">
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
										onReschedule={proposeMove}
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
									<DispatchChip
										key={item.id}
										item={item}
										onReschedule={proposeMove}
									/>
								))}
							</div>
						</CardContent>
					</Card>
				)}
				<CalendarScheduleMoveDialog
					proposal={moveProposal}
					pending={moveSchedule.isPending}
					onClose={() => setMoveProposal(null)}
					onConfirm={confirmMove}
				/>
				<DragOverlay>
					{activeItem ? (
						<div className="max-w-64 rounded border border-primary bg-background px-3 py-2 text-xs shadow-lg">
							<p className="font-mono font-semibold">
								{activeItem.order?.orderId || `#${activeItem.id}`}
							</p>
							<p className="truncate text-muted-foreground">
								{activeItem.order?.customer?.businessName ||
									activeItem.order?.customer?.name ||
									"Unknown customer"}
							</p>
						</div>
					) : null}
				</DragOverlay>
			</div>
		</DndContext>
	);
}

export function DispatchCalendarSkeleton() {
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
