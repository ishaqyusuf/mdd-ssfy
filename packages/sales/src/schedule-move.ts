import { createHash } from "node:crypto";

import { type Db, Prisma } from "@gnd/db";
import { z } from "zod";

import {
	createProductionDueDate,
	getProductionDateRange,
} from "./production-date";
import type { SalesPipelineSnapshot } from "./sales-pipeline";
import {
	SalesPipelineCommandRejectedError,
	runSalesPipelineCommandTransaction,
} from "./sales-pipeline-command-executor";
import { getSalesPipelineSnapshots } from "./sales-pipeline-order";

const calendarDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD business date")
	.refine((value) => {
		const parsed = new Date(`${value}T00:00:00.000Z`);
		return (
			!Number.isNaN(parsed.getTime()) &&
			parsed.toISOString().slice(0, 10) === value
		);
	}, "Expected a valid business date");

const scheduleMoveBaseSchema = z.object({
	requestId: z.string().uuid(),
	salesOrderId: z.number().int().positive(),
	targetDate: calendarDateSchema,
	expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
});

export const productionScheduleMoveSchema = scheduleMoveBaseSchema.extend({
	sourceDate: calendarDateSchema,
});

export const fulfillmentScheduleMoveSchema = scheduleMoveBaseSchema.extend({
	dispatchId: z.number().int().positive(),
	sourceDate: calendarDateSchema.nullable(),
});

export type ProductionScheduleMoveInput = z.infer<
	typeof productionScheduleMoveSchema
>;
export type FulfillmentScheduleMoveInput = z.infer<
	typeof fulfillmentScheduleMoveSchema
>;

export const scheduleMoveLockReasons = [
	"PERMISSION_DENIED",
	"WORKER_CALENDAR_READ_ONLY",
	"NO_ACTIVE_SCHEDULE_RECORDS",
	"PRODUCTION_GROUP_COMPLETED",
	"ORDER_FULFILLED",
	"ORDER_CANCELLED",
	"DISPATCH_IN_PROGRESS",
	"DISPATCH_COMPLETED",
	"DISPATCH_CANCELLED",
	"DISPATCH_DELETED",
	"DISPATCH_STATUS_UNAVAILABLE",
	"LIFECYCLE_CONFLICT",
] as const;

export type ScheduleMoveLockReason = (typeof scheduleMoveLockReasons)[number];

export type ScheduleMoveCapability = {
	canReschedule: boolean;
	lockReason: ScheduleMoveLockReason | null;
};

const allowedFulfillmentStatuses = new Set([
	"queue",
	"assigned",
	"packing",
	"packing queue",
	"packing-blocked",
	"packing blocked",
	"missing items",
	"ready-to-load",
	"ready to load",
	"packed",
]);

function locked(lockReason: ScheduleMoveLockReason): ScheduleMoveCapability {
	return { canReschedule: false, lockReason };
}

function normalizedStatus(value: string | null | undefined) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

export function resolveProductionScheduleMoveCapability(input: {
	authorized: boolean;
	workerMode?: boolean;
	assignments: Array<{
		completedAt?: Date | string | null;
		qtyCompleted?: number | null;
	}>;
	pipeline: SalesPipelineSnapshot | null | undefined;
}): ScheduleMoveCapability {
	if (input.workerMode) return locked("WORKER_CALENDAR_READ_ONLY");
	if (!input.authorized) return locked("PERMISSION_DENIED");
	if (!input.assignments.length) return locked("NO_ACTIVE_SCHEDULE_RECORDS");
	if (
		input.assignments.some(
			(assignment) =>
				Boolean(assignment.completedAt) ||
				Number(assignment.qtyCompleted || 0) > 0,
		)
	) {
		return locked("PRODUCTION_GROUP_COMPLETED");
	}
	const pipeline = input.pipeline;
	if (!pipeline) return locked("LIFECYCLE_CONFLICT");
	if (pipeline.commercial.state === "cancelled")
		return locked("ORDER_CANCELLED");
	if (pipeline.conflicts.some((conflict) => conflict.severity === "blocking")) {
		return locked("LIFECYCLE_CONFLICT");
	}
	if (
		pipeline.production.state === "completed" ||
		pipeline.production.state === "administratively_completed"
	) {
		return locked("PRODUCTION_GROUP_COMPLETED");
	}
	if (
		pipeline.fulfillment.state === "fulfilled" ||
		pipeline.fulfillment.state === "administratively_completed"
	) {
		return locked("ORDER_FULFILLED");
	}
	if (pipeline.dispatch.state === "completed")
		return locked("DISPATCH_COMPLETED");
	if (
		pipeline.dispatch.state === "in_transit" ||
		pipeline.dispatch.state === "partial"
	) {
		return locked("DISPATCH_IN_PROGRESS");
	}
	return { canReschedule: true, lockReason: null };
}

export function resolveFulfillmentScheduleMoveCapability(input: {
	authorized: boolean;
	dispatch: {
		status?: string | null;
		deletedAt?: Date | string | null;
		deliveredAt?: Date | string | null;
	};
	pipeline: SalesPipelineSnapshot | null | undefined;
}): ScheduleMoveCapability {
	if (!input.authorized) return locked("PERMISSION_DENIED");
	if (input.dispatch.deletedAt) return locked("DISPATCH_DELETED");
	const status = normalizedStatus(input.dispatch.status);
	if (status === "cancelled") return locked("DISPATCH_CANCELLED");
	if (status === "completed" || input.dispatch.deliveredAt) {
		return locked("DISPATCH_COMPLETED");
	}
	if (
		status === "in progress" ||
		status === "in_transit" ||
		status === "in transit"
	) {
		return locked("DISPATCH_IN_PROGRESS");
	}
	if (!allowedFulfillmentStatuses.has(status)) {
		return locked("DISPATCH_STATUS_UNAVAILABLE");
	}
	const pipeline = input.pipeline;
	if (!pipeline) return locked("LIFECYCLE_CONFLICT");
	if (pipeline.commercial.state === "cancelled")
		return locked("ORDER_CANCELLED");
	if (pipeline.conflicts.some((conflict) => conflict.severity === "blocking")) {
		return locked("LIFECYCLE_CONFLICT");
	}
	if (
		pipeline.fulfillment.state === "fulfilled" ||
		pipeline.fulfillment.state === "administratively_completed"
	) {
		return locked("ORDER_FULFILLED");
	}
	if (pipeline.dispatch.state === "completed")
		return locked("DISPATCH_COMPLETED");
	if (
		pipeline.dispatch.state === "in_transit" ||
		pipeline.dispatch.state === "partial"
	) {
		return locked("DISPATCH_IN_PROGRESS");
	}
	return { canReschedule: true, lockReason: null };
}

export function scheduleMoveDate(value: string) {
	const parsed = calendarDateSchema.parse(value);
	const [year = 0, month = 0, day = 0] = parsed.split("-").map(Number);
	return createProductionDueDate({ year, month, day });
}

export function scheduleBusinessDate(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString().slice(0, 10);
}

export class SalesScheduleMoveError extends Error {
	constructor(
		message: string,
		public readonly code:
			| ScheduleMoveLockReason
			| "NO_OP"
			| "NOT_FOUND"
			| "STALE_SOURCE_DATE"
			| "STALE_REVISION"
			| "IDEMPOTENCY_CONFLICT"
			| "CONCURRENT_UPDATE",
	) {
		super(message);
		this.name = "SalesScheduleMoveError";
	}
}

function fingerprint(value: Record<string, unknown>) {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function productionFingerprint(input: ProductionScheduleMoveInput) {
	return fingerprint({
		kind: "production",
		salesOrderId: input.salesOrderId,
		sourceDate: input.sourceDate,
		targetDate: input.targetDate,
		expectedRevision: input.expectedRevision,
	});
}

function fulfillmentFingerprint(input: FulfillmentScheduleMoveInput) {
	return fingerprint({
		kind: "fulfillment",
		salesOrderId: input.salesOrderId,
		dispatchId: input.dispatchId,
		sourceDate: input.sourceDate,
		targetDate: input.targetDate,
		expectedRevision: input.expectedRevision,
	});
}

type ScheduleHistory = {
	id: string;
	salesId: number;
	name: string | null;
	data: unknown;
};

type ProductionScheduleMoveData = {
	event: "SALES_SCHEDULE_MOVED";
	kind: "production";
	requestId: string;
	commandFingerprint: string;
	salesOrderId: number;
	orderNo: string;
	sourceDate: string;
	targetDate: string;
	assignmentIds: number[];
	affectedRecordCount: number;
	workerIds: number[];
	expectedRevision: string;
	actorId: number;
	movedAt: string;
};

type FulfillmentScheduleMoveData = {
	event: "SALES_SCHEDULE_MOVED";
	kind: "fulfillment";
	requestId: string;
	commandFingerprint: string;
	salesOrderId: number;
	orderNo: string;
	dispatchId: number;
	sourceDate: string | null;
	targetDate: string;
	affectedRecordCount: number;
	driverId: number | null;
	deliveryMode: string;
	expectedRevision: string;
	actorId: number;
	movedAt: string;
};

async function findReplay(db: Db, requestId: string) {
	return db.salesHistory.findUnique({
		where: { id: requestId },
		select: { id: true, salesId: true, name: true, data: true },
	}) as Promise<ScheduleHistory | null>;
}

function replayData<T extends Record<string, unknown>>(
	history: ScheduleHistory,
	expectedFingerprint: string,
) {
	const data = history.data as Record<string, unknown> | null;
	if (
		data?.event !== "SALES_SCHEDULE_MOVED" ||
		data.commandFingerprint !== expectedFingerprint
	) {
		throw new SalesScheduleMoveError(
			"That request identity was already used for another schedule change.",
			"IDEMPOTENCY_CONFLICT",
		);
	}
	return data as T;
}

function assertDifferentDate(sourceDate: string | null, targetDate: string) {
	if (sourceDate === targetDate) {
		throw new SalesScheduleMoveError(
			"The schedule already uses that date.",
			"NO_OP",
		);
	}
}

function capabilityError(capability: ScheduleMoveCapability): never {
	const reason = capability.lockReason || "LIFECYCLE_CONFLICT";
	throw new SalesScheduleMoveError(
		`This schedule is locked: ${reason.toLowerCase().replaceAll("_", " ")}.`,
		reason,
	);
}

export type ScheduleMoveActor = { id: number; name: string };

type ScheduleMoveDependencies = {
	getSnapshots: typeof getSalesPipelineSnapshots;
	runCommand: typeof runSalesPipelineCommandTransaction;
};

const defaultDependencies: ScheduleMoveDependencies = {
	getSnapshots: getSalesPipelineSnapshots,
	runCommand: runSalesPipelineCommandTransaction,
};

export async function moveProductionScheduleGroup(
	db: Db,
	inputValue: ProductionScheduleMoveInput,
	actor: ScheduleMoveActor,
	dependencyOverrides: Partial<ScheduleMoveDependencies> = {},
) {
	const dependencies = { ...defaultDependencies, ...dependencyOverrides };
	const input = productionScheduleMoveSchema.parse(inputValue);
	assertDifferentDate(input.sourceDate, input.targetDate);
	const commandFingerprint = productionFingerprint(input);
	const prior = await findReplay(db, input.requestId);
	if (prior) {
		const data = replayData<ProductionScheduleMoveData>(
			prior,
			commandFingerprint,
		);
		return { ...data, idempotentReplay: true };
	}
	try {
		const execution = await dependencies.runCommand(
			db,
			{
				salesOrderId: input.salesOrderId,
				action: "production.reschedule",
				authorized: true,
				expectedRevision: input.expectedRevision,
				enforce: true,
				executeOnReplay: true,
				operation: "sales.production.schedule-move",
			},
			async (tx) => {
				const replay = await findReplay(tx, input.requestId);
				if (replay)
					return {
						...replayData<ProductionScheduleMoveData>(
							replay,
							commandFingerprint,
						),
						idempotentReplay: true,
					};
				const sourceRange = getProductionDateRange(input.sourceDate);
				await tx.$queryRaw(Prisma.sql`
					SELECT id FROM OrderItemProductionAssignments
					WHERE orderId = ${input.salesOrderId}
						AND deletedAt IS NULL
						AND dueDate >= ${sourceRange.gte}
						AND dueDate < ${sourceRange.lt}
					FOR UPDATE
				`);
				const assignments = await tx.orderItemProductionAssignments.findMany({
					where: {
						orderId: input.salesOrderId,
						deletedAt: null,
						dueDate: sourceRange,
					},
					select: {
						id: true,
						assignedToId: true,
						completedAt: true,
						qtyCompleted: true,
					},
				});
				const pipeline = (
					await dependencies.getSnapshots(tx, [input.salesOrderId])
				).get(input.salesOrderId);
				if (pipeline?.revision !== input.expectedRevision) {
					throw new SalesScheduleMoveError(
						"The schedule changed while it was being reviewed. Refresh and try again.",
						"STALE_REVISION",
					);
				}
				const capability = resolveProductionScheduleMoveCapability({
					authorized: true,
					assignments,
					pipeline,
				});
				if (!capability.canReschedule) capabilityError(capability);
				const assignmentIds = assignments
					.map((assignment) => assignment.id)
					.sort((a, b) => a - b);
				const updated = await tx.orderItemProductionAssignments.updateMany({
					where: {
						id: { in: assignmentIds },
						orderId: input.salesOrderId,
						deletedAt: null,
						completedAt: null,
						dueDate: sourceRange,
					},
					data: { dueDate: scheduleMoveDate(input.targetDate) },
				});
				if (updated.count !== assignmentIds.length) {
					throw new SalesScheduleMoveError(
						"The Production Schedule Group changed before the move committed.",
						"CONCURRENT_UPDATE",
					);
				}
				const data: ProductionScheduleMoveData = {
					event: "SALES_SCHEDULE_MOVED",
					kind: "production",
					requestId: input.requestId,
					commandFingerprint,
					salesOrderId: input.salesOrderId,
					orderNo: pipeline.evidence.orderNo,
					sourceDate: input.sourceDate,
					targetDate: input.targetDate,
					assignmentIds,
					affectedRecordCount: assignmentIds.length,
					workerIds: Array.from(
						new Set(
							assignments
								.map((row) => row.assignedToId)
								.filter((id): id is number => id != null),
						),
					),
					expectedRevision: input.expectedRevision,
					actorId: actor.id,
					movedAt: new Date().toISOString(),
				};
				await tx.salesHistory.create({
					data: {
						id: input.requestId,
						salesId: input.salesOrderId,
						name: "Production schedule moved",
						authorName: actor.name,
						data: data satisfies Prisma.InputJsonObject,
					},
				});
				return { ...data, idempotentReplay: false };
			},
		);
		if (!execution.executed || !execution.value) {
			throw new SalesScheduleMoveError(
				"The Production schedule move did not execute.",
				"CONCURRENT_UPDATE",
			);
		}
		return execution.value;
	} catch (error) {
		if (error instanceof SalesScheduleMoveError) throw error;
		if (error instanceof SalesPipelineCommandRejectedError) {
			const stale = error.decision?.reasons.includes("STALE_REVISION");
			throw new SalesScheduleMoveError(
				error.message,
				stale ? "STALE_REVISION" : "LIFECYCLE_CONFLICT",
			);
		}
		const replay = await findReplay(db, input.requestId);
		if (replay)
			return {
				...replayData<ProductionScheduleMoveData>(replay, commandFingerprint),
				idempotentReplay: true,
			};
		throw error;
	}
}

export async function moveFulfillmentSchedule(
	db: Db,
	inputValue: FulfillmentScheduleMoveInput,
	actor: ScheduleMoveActor,
	dependencyOverrides: Partial<ScheduleMoveDependencies> = {},
) {
	const dependencies = { ...defaultDependencies, ...dependencyOverrides };
	const input = fulfillmentScheduleMoveSchema.parse(inputValue);
	assertDifferentDate(input.sourceDate, input.targetDate);
	const commandFingerprint = fulfillmentFingerprint(input);
	const prior = await findReplay(db, input.requestId);
	if (prior)
		return {
			...replayData<FulfillmentScheduleMoveData>(prior, commandFingerprint),
			idempotentReplay: true,
		};
	try {
		const execution = await dependencies.runCommand(
			db,
			{
				salesOrderId: input.salesOrderId,
				action: "fulfillment.reschedule",
				authorized: true,
				expectedRevision: input.expectedRevision,
				enforce: true,
				executeOnReplay: true,
				operation: "sales.fulfillment.schedule-move",
			},
			async (tx) => {
				const replay = await findReplay(tx, input.requestId);
				if (replay)
					return {
						...replayData<FulfillmentScheduleMoveData>(
							replay,
							commandFingerprint,
						),
						idempotentReplay: true,
					};
				await tx.$queryRaw(Prisma.sql`
					SELECT id FROM OrderDelivery
					WHERE id = ${input.dispatchId}
					FOR UPDATE
				`);
				const dispatch = await tx.orderDelivery.findFirst({
					where: { id: input.dispatchId, salesOrderId: input.salesOrderId },
					select: {
						id: true,
						salesOrderId: true,
						status: true,
						dueDate: true,
						deliveredAt: true,
						deletedAt: true,
						driverId: true,
						deliveryMode: true,
					},
				});
				if (!dispatch) {
					throw new SalesScheduleMoveError(
						"The Fulfillment schedule no longer exists.",
						"NOT_FOUND",
					);
				}
				if (scheduleBusinessDate(dispatch.dueDate) !== input.sourceDate) {
					throw new SalesScheduleMoveError(
						"The Fulfillment due date changed while it was being reviewed.",
						"STALE_SOURCE_DATE",
					);
				}
				const pipeline = (
					await dependencies.getSnapshots(tx, [input.salesOrderId])
				).get(input.salesOrderId);
				if (pipeline?.revision !== input.expectedRevision) {
					throw new SalesScheduleMoveError(
						"The schedule changed while it was being reviewed. Refresh and try again.",
						"STALE_REVISION",
					);
				}
				const capability = resolveFulfillmentScheduleMoveCapability({
					authorized: true,
					dispatch,
					pipeline,
				});
				if (!capability.canReschedule) capabilityError(capability);
				const updated = await tx.orderDelivery.updateMany({
					where: {
						id: input.dispatchId,
						salesOrderId: input.salesOrderId,
						deletedAt: null,
						status: dispatch.status,
						dueDate: dispatch.dueDate,
					},
					data: { dueDate: scheduleMoveDate(input.targetDate) },
				});
				if (updated.count !== 1) {
					throw new SalesScheduleMoveError(
						"The Fulfillment schedule changed before the move committed.",
						"CONCURRENT_UPDATE",
					);
				}
				const data: FulfillmentScheduleMoveData = {
					event: "SALES_SCHEDULE_MOVED",
					kind: "fulfillment",
					requestId: input.requestId,
					commandFingerprint,
					salesOrderId: input.salesOrderId,
					orderNo: pipeline.evidence.orderNo,
					dispatchId: input.dispatchId,
					sourceDate: input.sourceDate,
					targetDate: input.targetDate,
					affectedRecordCount: 1,
					driverId: dispatch.driverId,
					deliveryMode: dispatch.deliveryMode,
					expectedRevision: input.expectedRevision,
					actorId: actor.id,
					movedAt: new Date().toISOString(),
				};
				await tx.salesHistory.create({
					data: {
						id: input.requestId,
						salesId: input.salesOrderId,
						name: "Fulfillment schedule moved",
						authorName: actor.name,
						data: data satisfies Prisma.InputJsonObject,
					},
				});
				return { ...data, idempotentReplay: false };
			},
		);
		if (!execution.executed || !execution.value) {
			throw new SalesScheduleMoveError(
				"The Fulfillment schedule move did not execute.",
				"CONCURRENT_UPDATE",
			);
		}
		return execution.value;
	} catch (error) {
		if (error instanceof SalesScheduleMoveError) throw error;
		if (error instanceof SalesPipelineCommandRejectedError) {
			const stale = error.decision?.reasons.includes("STALE_REVISION");
			throw new SalesScheduleMoveError(
				error.message,
				stale ? "STALE_REVISION" : "LIFECYCLE_CONFLICT",
			);
		}
		const replay = await findReplay(db, input.requestId);
		if (replay)
			return {
				...replayData<FulfillmentScheduleMoveData>(replay, commandFingerprint),
				idempotentReplay: true,
			};
		throw error;
	}
}
