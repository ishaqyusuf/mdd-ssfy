"use client";

import {
	CalendarScheduleMoveDialog,
	type CalendarScheduleMoveProposal,
} from "@/components/calendar-schedule-move-dialog";
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
import { Skeleton } from "@gnd/ui/skeleton";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useSuspenseInfiniteQuery } from "@tanstack/react-query";
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
	sourceDate: string | null;
	expectedEvidenceRevision: string | null;
	canReschedule: boolean;
	rescheduleLockReason: string | null;
	deliveryMode: string | null;
	driver?: { name: string | null } | null;
	order?: {
		id: number;
		orderId?: string | null;
		customer?: { name?: string | null; businessName?: string | null } | null;
	} | null;
	workspace?: { label: string; isTerminal: boolean };
};
type FulfillmentMoveProposal = CalendarScheduleMoveProposal & {
	item: CalendarRow;
};

function DispatchChip({
	item,
	onReschedule,
}: {
	item: CalendarRow;
	onReschedule?: (item: CalendarRow) => void;
}) {
	const overview = useSalesOverviewQuery();
	const draggable = useDraggable({
		id: `fulfillment-v2:${item.id}`,
		data: { item },
		disabled: !item.canReschedule,
	});
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
		<div
			ref={draggable.setNodeRef}
			style={{
				transform: CSS.Translate.toString(draggable.transform),
				opacity: draggable.isDragging ? 0.35 : undefined,
			}}
			className={cn(
				"flex w-full items-start gap-1 rounded-lg border bg-card p-2 text-left transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted/50",
				overdue && "border-destructive",
			)}
		>
			<button
				type="button"
				className="flex min-w-0 flex-1 flex-col gap-1 text-left focus-visible:outline-none"
				onClick={() => {
					const orderNo = item.order?.orderId;
					if (!orderNo) return;
					overview.openDispatch(orderNo, item.id, "packing");
				}}
			>
				<div className="flex w-full items-start justify-between gap-2">
					<span className="truncate font-mono text-xs font-semibold">
						{item.order?.orderId || `#${item.id}`}
					</span>
					{overdue ? <Badge variant="destructive">Overdue</Badge> : null}
				</div>
				<span className="truncate text-xs text-muted-foreground">
					{customer}
				</span>
				<div className="flex w-full items-center justify-between gap-2">
					<Badge variant="outline">
						{item.workspace?.label || item.status || "Queued"}
					</Badge>
					<span className="truncate text-xs text-muted-foreground">
						{item.driver?.name || "Unassigned"}
					</span>
				</div>
			</button>
			{item.canReschedule ? (
				<div className="flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						className="rounded px-1 text-xs font-semibold text-muted-foreground hover:bg-muted focus-visible:outline-none"
						onClick={() => onReschedule?.(item)}
						aria-label={`Reschedule ${item.order?.orderId || `#${item.id}`}`}
						title="Reschedule"
					>
						↗
					</button>
					<button
						type="button"
						ref={draggable.setActivatorNodeRef}
						{...draggable.listeners}
						{...draggable.attributes}
						className="cursor-grab rounded px-1 text-xs font-semibold text-muted-foreground hover:bg-muted focus-visible:outline-none active:cursor-grabbing"
						aria-label={`Drag ${item.order?.orderId || `#${item.id}`} to another fulfillment date`}
						title="Drag to reschedule"
					>
						⠿
					</button>
				</div>
			) : (
				<span
					className="shrink-0 text-xs text-muted-foreground"
					title={item.rescheduleLockReason || "Schedule locked"}
					aria-label={item.rescheduleLockReason || "Schedule locked"}
				>
					🔒
				</span>
			)}
		</div>
	);
}

function DispatchCalendarDay({
	day,
	items,
	onReschedule,
}: {
	day: Date;
	items: CalendarRow[];
	onReschedule: (item: CalendarRow) => void;
}) {
	const dateKey = format(day, "yyyy-MM-dd");
	const droppable = useDroppable({
		id: `fulfillment-v2-date:${dateKey}`,
		data: { date: dateKey },
	});
	return (
		<div
			ref={droppable.setNodeRef}
			className={cn(
				"min-h-[420px] border-r last:border-r-0",
				isToday(day) && "bg-muted/30",
				droppable.isOver && "bg-primary/10 ring-2 ring-inset ring-primary",
			)}
		>
			<div className="border-b p-3 text-center">
				<p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
				<p className="text-lg font-semibold">{format(day, "d")}</p>
				<p className="text-xs text-muted-foreground">{format(day, "MMM")}</p>
			</div>
			<div className="flex flex-col gap-2 p-2">
				{items.map((item) => (
					<DispatchChip key={item.id} item={item} onReschedule={onReschedule} />
				))}
				{items.length === 0 ? (
					<p className="py-8 text-center text-xs text-muted-foreground">
						No dispatches
					</p>
				) : null}
			</div>
		</div>
	);
}

export function DispatchCalendarView() {
	const trpc = useTRPC();
	const [moveProposal, setMoveProposal] =
		useState<FulfillmentMoveProposal | null>(null);
	const [activeItem, setActiveItem] = useState<CalendarRow | null>(null);
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

	function proposeMove(item: CalendarRow, targetDate?: string) {
		if (
			!item.canReschedule ||
			!item.expectedEvidenceRevision ||
			!item.order?.id
		)
			return;
		setMoveProposal({
			kind: "fulfillment",
			orderNo: item.order?.orderId || `#${item.id}`,
			customer:
				item.order?.customer?.businessName ||
				item.order?.customer?.name ||
				"Unknown customer",
			sourceDate: item.sourceDate,
			targetDate: targetDate || item.sourceDate || "",
			affectedRecordCount: 1,
			item,
		});
	}

	function handleDragStart(event: DragStartEvent) {
		const item = event.active.data.current?.item as CalendarRow | undefined;
		setActiveItem(item || null);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveItem(null);
		const item = event.active.data.current?.item as CalendarRow | undefined;
		const targetDate = event.over?.data.current?.date as string | undefined;
		if (!item || !targetDate || targetDate === item.sourceDate) return;
		proposeMove(item, targetDate);
	}

	function confirmMove(targetDate: string) {
		const proposal = moveProposal;
		const salesOrderId = proposal?.item.order?.id;
		if (
			!proposal ||
			!salesOrderId ||
			!proposal.item.expectedEvidenceRevision ||
			targetDate === proposal.item.sourceDate
		) {
			return;
		}
		moveSchedule.mutate({
			requestId: crypto.randomUUID(),
			dispatchId: proposal.item.id,
			salesOrderId,
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
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setWeekOffset(0)}
							>
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
							<DispatchCalendarDay
								key={day.toISOString()}
								day={day}
								items={items}
								onReschedule={proposeMove}
							/>
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
								<DispatchChip
									key={item.id}
									item={item}
									onReschedule={proposeMove}
								/>
							))}
						</CardContent>
					</Card>
				) : null}
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
	return <Skeleton className="h-[520px] rounded-xl" />;
}
