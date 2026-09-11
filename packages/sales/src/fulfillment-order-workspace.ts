import type { projectFulfillmentQuantities } from "./fulfillment-quantities";
import {
	getDispatchDateBoundaries,
	getDispatchDueBucket,
} from "./dispatch-manifest/driver-work-queue";
import {
	projectDispatchOperationalRecord,
	type DispatchWorkspaceStage,
} from "./dispatch-manifest/status";
import {
	projectDispatchRisks,
	type DispatchRiskCode,
} from "./dispatch-manifest/workspace";

export type FulfillmentOrderWorkspaceInput = {
	id: number;
	quantities: ReturnType<typeof projectFulfillmentQuantities>;
	completed: boolean;
	deliveryMode?: string | null;
	dueDate?: Date | null;
	fulfillments: Array<{
		id: number;
		status: string | null;
		meta: unknown;
		driverId: number | null;
		driverName: string | null;
		dueDate: Date | null;
		deliveryMode: string;
		itemCount: number;
		stockAllocationCount: number;
		hasOpenException: boolean;
		plannedQty?: number | null;
		packedQty?: number;
	}>;
};
export type FulfillmentOrderFilter = {
	section?: string;
	stages?: readonly DispatchWorkspaceStage[] | null;
	driversId?: readonly number[] | null;
	dueBuckets?: readonly string[] | null;
	deliveryModes?: readonly string[] | null;
	risks?: readonly DispatchRiskCode[] | null;
	scheduleRange?: readonly string[] | null;
};

export function projectFulfillmentOrderWorkspace(
	input: FulfillmentOrderWorkspaceInput,
	clock: { now: Date; timeZone: string },
) {
	const { startToday } = getDispatchDateBoundaries(clock);
	const fulfillments = input.fulfillments.map((fulfillment) => {
		const lifecycle = projectDispatchOperationalRecord(fulfillment);
		const dueBucket = getDispatchDueBucket(fulfillment.dueDate, clock);
		return {
			id: fulfillment.id,
			status: fulfillment.status,
			driverId: fulfillment.driverId,
			driverName: fulfillment.driverName,
			dueDate: fulfillment.dueDate,
			deliveryMode: fulfillment.deliveryMode,
			stage: lifecycle.stage,
			plannedQty: fulfillment.plannedQty ?? null,
			packedQty: fulfillment.packedQty ?? 0,
			deliveredQty:
				lifecycle.stage === "fulfilled" ? (fulfillment.packedQty ?? 0) : 0,
			active: !input.completed && lifecycle.isActive,
			dueBucket,
			risks: projectDispatchRisks({
				stage: lifecycle.stage,
				dueDate: fulfillment.dueDate,
				hasOpenException: fulfillment.hasOpenException,
				now: startToday,
			}),
		};
	});
	const active = fulfillments.filter((fulfillment) => fulfillment.active);
	const drivers = new Map<number, { id: number; name: string | null }>();
	for (const fulfillment of active)
		if (fulfillment.driverId !== null)
			drivers.set(fulfillment.driverId, {
				id: fulfillment.driverId,
				name: fulfillment.driverName,
			});
	return {
		id: input.id,
		dueDate: input.dueDate ?? null,
		deliveryMode: input.deliveryMode ?? null,
		dueBucket: getDispatchDueBucket(input.dueDate, clock),
		fulfillments,
		activeCount: active.length,
		completed: input.completed,
		risks: projectDispatchRisks({
			stage: input.completed ? "fulfilled" : "ready_to_assign",
			dueDate: input.dueDate,
			now: startToday,
		}).filter(
			(risk) => risk !== "unassigned" || input.deliveryMode !== "pickup",
		),
		backlog:
			input.fulfillments.length > 0 &&
			!input.completed &&
			input.quantities.resolved &&
			input.quantities.backlogQty > 0,
		quantities: input.quantities,
		drivers: [...drivers.values()].sort((a, b) => a.id - b.id),
		unassignedCount: active.filter(
			(fulfillment) =>
				fulfillment.driverId === null && fulfillment.deliveryMode !== "pickup",
		).length,
		nextDueDate:
			active
				.map((fulfillment) => fulfillment.dueDate)
				.filter((date): date is Date => date !== null)
				.sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
	};
}
export type FulfillmentOrderWorkspace = ReturnType<
	typeof projectFulfillmentOrderWorkspace
>;

type SortableOrder = {
	id: number;
	orderNo: string;
	customerName: string;
	createdAt: Date | null;
	deliveredAt?: Date | null;
	workspace: { nextDueDate: Date | null };
};

/** Null schedules stay last; the order identity breaks ties across page boundaries. */
export function compareFulfillmentOrders(
	a: SortableOrder,
	b: SortableOrder,
	sort?: readonly string[] | null,
) {
	for (const entry of sort?.length ? sort : ["createdAt.asc"]) {
		const [field, direction] = entry.split(".");
		const value = (row: SortableOrder) => {
			if (field === "deliveredAt") return row.deliveredAt?.getTime() ?? null;
			if (field === "dueDate")
				return row.workspace.nextDueDate?.getTime() ?? null;
			if (field === "orderId") return row.orderNo;
			if (field === "customerName") return row.customerName;
			return row.createdAt?.getTime() ?? null;
		};
		const av = value(a),
			bv = value(b);
		if (av === null && bv !== null) return 1;
		if (bv === null && av !== null) return -1;
		const difference =
			typeof av === "string" && typeof bv === "string"
				? av.localeCompare(bv, "en", { numeric: true })
				: Number(av) - Number(bv);
		if (difference) return direction === "desc" ? -difference : difference;
	}
	return a.id - b.id;
}

/** All assignment filters apply to one child; aggregation still includes its siblings. */
export function matchesFulfillmentOrder(
	row: FulfillmentOrderWorkspace,
	filter: FulfillmentOrderFilter,
) {
	if (filter.section === "backlog" && !row.backlog) return false;
	if (filter.section === "completed" && !row.completed) return false;
	if (
		["active", "due-today", "past-due"].includes(filter.section || "") &&
		(row.completed || row.activeCount === 0)
	)
		return false;
	const from = filter.scheduleRange?.[0]
		? new Date(filter.scheduleRange[0]).getTime()
		: NaN;
	const to = filter.scheduleRange?.[1]
		? new Date(filter.scheduleRange[1]).getTime()
		: NaN;
	const hasScheduleRange = Number.isFinite(from);
	const hasChildFilter = Boolean(
		hasScheduleRange ||
			filter.stages?.length ||
			filter.driversId?.length ||
			filter.dueBuckets?.length ||
			filter.deliveryModes?.length ||
			filter.risks?.length ||
			filter.section === "due-today" ||
			filter.section === "past-due",
	);
	if (!hasChildFilter) return true;
	const candidates = row.fulfillments.length
		? row.fulfillments
		: [
				{
					stage: row.completed
						? ("fulfilled" as const)
						: ("ready_to_assign" as const),
					active: false,
					driverId: null,
					deliveryMode: row.deliveryMode,
					dueDate: row.dueDate,
					dueBucket: row.dueBucket,
					risks: row.risks,
				},
			];
	return candidates.some((fulfillment) => {
		if (hasScheduleRange) {
			const due = fulfillment.dueDate?.getTime();
			if (due === undefined || due < from || (Number.isFinite(to) && due > to))
				return false;
		}
		if (
			["active", "due-today", "past-due"].includes(filter.section || "") &&
			!fulfillment.active
		)
			return false;
		if (filter.section === "due-today" && fulfillment.dueBucket !== "today")
			return false;
		if (filter.section === "past-due" && fulfillment.dueBucket !== "overdue")
			return false;
		if (filter.stages?.length && !filter.stages.includes(fulfillment.stage))
			return false;
		if (
			filter.driversId?.length &&
			(fulfillment.driverId === null ||
				!filter.driversId.includes(fulfillment.driverId))
		)
			return false;
		if (
			filter.dueBuckets?.length &&
			!filter.dueBuckets.includes(fulfillment.dueBucket)
		)
			return false;
		if (
			filter.deliveryModes?.length &&
			!filter.deliveryModes.includes(fulfillment.deliveryMode || "")
		)
			return false;
		if (
			filter.risks?.length &&
			!filter.risks.some((risk) => fulfillment.risks.includes(risk))
		)
			return false;
		return true;
	});
}

export function countFulfillmentOrderSections(
	rows: FulfillmentOrderWorkspace[],
	filter: Omit<FulfillmentOrderFilter, "section"> = {},
) {
	const result = {
		all: 0,
		active: 0,
		backlog: 0,
		completed: 0,
		dueToday: 0,
		pastDue: 0,
	};
	for (const row of rows) {
		if (matchesFulfillmentOrder(row, { ...filter, section: undefined }))
			result.all++;
		if (matchesFulfillmentOrder(row, { ...filter, section: "active" }))
			result.active++;
		if (matchesFulfillmentOrder(row, { ...filter, section: "backlog" }))
			result.backlog++;
		if (matchesFulfillmentOrder(row, { ...filter, section: "completed" }))
			result.completed++;
		if (matchesFulfillmentOrder(row, { ...filter, section: "due-today" }))
			result.dueToday++;
		if (matchesFulfillmentOrder(row, { ...filter, section: "past-due" }))
			result.pastDue++;
	}
	return result;
}
