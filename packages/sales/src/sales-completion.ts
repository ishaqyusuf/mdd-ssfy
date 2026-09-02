import { createHash, randomUUID } from "node:crypto";

import type { Database, Prisma, TransactionClient } from "@gnd/db";
import { z } from "zod";

import { hasCompletedProductionLifecycle } from "./bulk-production-completion";
import { getSalesOrderLifecycleStatus } from "./order-status";
import { overallStatus } from "./utils/utils";

export const salesCompletionMilestoneSchema = z.enum([
	"PRODUCTION_COMPLETED",
	"FULFILLMENT_COMPLETED",
]);
export const salesCompletionMethodSchema = z.enum([
	"STATUS_ONLY",
	"FULL_WORKFLOW",
]);
export const salesCompletionRecordStateSchema = z.enum(["ACTIVE", "CANCELLED"]);
export const SALES_COMPLETION_FILTER_OPTIONS = [
	"pending",
	"completed",
] as const;
export const salesCompletionSatisfactionFilterSchema = z.enum(
	SALES_COMPLETION_FILTER_OPTIONS,
);

export type SalesCompletionMilestone = z.infer<
	typeof salesCompletionMilestoneSchema
>;
export type SalesCompletionMethod = z.infer<typeof salesCompletionMethodSchema>;

export const salesCompletionProjectionInputSchema = z.object({
	salesOrderId: z.number().int().positive(),
});

export const markProductionCompletionStatusOnlySchema =
	salesCompletionProjectionInputSchema.extend({
		requestId: z.string().uuid(),
		expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
		effectiveAt: z.coerce.date().optional().nullable(),
	});

export const cancelProductionCompletionStatusOnlySchema =
	salesCompletionProjectionInputSchema.extend({
		requestId: z.string().uuid(),
		expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
		reason: z.string().trim().max(500).optional().nullable(),
	});

export const markFulfillmentCompletionStatusOnlySchema =
	markProductionCompletionStatusOnlySchema;

export const markSalesCompletionStatusOnlyBulkSchema = z.object({
	salesOrderIds: z.array(z.number().int().positive()).min(1).max(100),
	requestId: z.string().uuid(),
	effectiveAt: z.coerce.date().optional().nullable(),
});

export const markProductionCompletionStatusOnlyBulkSchema =
	markSalesCompletionStatusOnlyBulkSchema;

export const markFulfillmentCompletionStatusOnlyBulkSchema =
	markSalesCompletionStatusOnlyBulkSchema;

export const cancelFulfillmentCompletionStatusOnlySchema =
	cancelProductionCompletionStatusOnlySchema;

export type SalesCompletionSource =
	| "OPERATIONAL_WORKFLOW"
	| "STATUS_ONLY"
	| "IMPLIED_BY_FULFILLMENT"
	| "NONE";

export type SalesFulfillmentDisposition =
	| "FULFILLED"
	| "ADMINISTRATIVELY_COMPLETED"
	| "PENDING";

export type SalesCompletionStatusOnlyBulkItem = {
	salesOrderId: number;
	status: "completed" | "replayed" | "skipped" | "failed";
	code: SalesCompletionError["code"] | null;
	message: string | null;
};

export type SalesCompletionStatusOnlyBulkResult = {
	requested: number;
	completed: number;
	replayed: number;
	skipped: number;
	failed: number;
	items: SalesCompletionStatusOnlyBulkItem[];
};

export type SalesCompletionRecordView = {
	id: string;
	requestId: string;
	cancellationRequestId: string | null;
	salesOrderId: number;
	milestone: SalesCompletionMilestone;
	completionMethod: SalesCompletionMethod;
	state: "ACTIVE" | "CANCELLED";
	effectiveAt: Date | null;
	recordedAt: Date;
	recordedBy: { id: number; name: string | null };
	cancelledAt: Date | null;
	cancelledBy: { id: number; name: string | null } | null;
	cancellationReason: string | null;
	updatedAt: Date;
};

export type SalesCompletionProjection = {
	salesOrderId: number;
	orderNo: string;
	orderCreatedAt: Date | null;
	isRecentOrder: boolean;
	revision: string;
	operationalProductionCompleted: boolean;
	canonicalFulfilled: boolean;
	productionCompletionSatisfied: boolean;
	fulfillmentCompletionSatisfied: boolean;
	fulfillmentDisposition: SalesFulfillmentDisposition;
	productionCompletionSource: SalesCompletionSource;
	fulfillmentCompletionSource: SalesCompletionSource;
	productionCompletionMethod: SalesCompletionMethod | null;
	fulfillmentMethod: SalesCompletionMethod | null;
	productionEffectiveAt: Date | null;
	fulfillmentEffectiveAt: Date | null;
	productionRecordedAt: Date | null;
	fulfillmentRecordedAt: Date | null;
	availableActions: {
		markProductionStatusOnly: boolean;
		cancelProductionStatusOnly: boolean;
		productionCancellationBlockedReason: string | null;
		markFulfillmentStatusOnly: boolean;
		cancelFulfillmentStatusOnly: boolean;
	};
	activeProductionRecord: SalesCompletionRecordView | null;
	activeFulfillmentRecord: SalesCompletionRecordView | null;
	history: SalesCompletionRecordView[];
};

export class SalesCompletionError extends Error {
	constructor(
		message: string,
		readonly code:
			| "NOT_FOUND"
			| "INVALID_TRANSITION"
			| "STALE_STATE"
			| "METHOD_MISMATCH"
			| "IDEMPOTENCY_CONFLICT"
			| "PERSISTENCE_FAILURE",
	) {
		super(message);
		this.name = "SalesCompletionError";
	}
}

type CompletionDb = Database | TransactionClient;

export const salesCompletionRecordSelect = {
	id: true,
	requestId: true,
	cancellationRequestId: true,
	salesOrderId: true,
	milestone: true,
	completionMethod: true,
	state: true,
	effectiveAt: true,
	recordedAt: true,
	recordedBy: { select: { id: true, name: true } },
	cancelledAt: true,
	cancelledBy: { select: { id: true, name: true } },
	cancellationReason: true,
	updatedAt: true,
} satisfies Prisma.SalesCompletionRecordSelect;

export type SalesCompletionOrderRow = {
	id: number;
	orderId: string;
	createdAt: Date | null;
	updatedAt: Date | null;
	status: string | null;
	prodStatus: string | null;
	stat: Array<{
		type: string;
		percentage: number | null;
		score: number | null;
		total: number | null;
		deletedAt?: Date | null;
	}>;
	deliveries: Array<{
		status?: string | null;
		meta?: unknown;
		_count?: { items?: number | null } | null;
	}>;
	completionRecords: SalesCompletionRecordView[];
};

export function salesCompletionProjectionSourceRevision(input: {
	createdAt: Date | null;
	updatedAt: Date | null;
	completionRecords?: Array<{ updatedAt: Date }>;
}) {
	return [
		input.updatedAt,
		input.createdAt,
		...(input.completionRecords ?? []).map((record) => record.updatedAt),
	]
		.filter((value): value is Date => Boolean(value))
		.reduce(
			(latest, value) => (value.getTime() > latest.getTime() ? value : latest),
			new Date(0),
		);
}

export function buildSalesCompletionSatisfactionWhere(
	milestone: SalesCompletionMilestone,
	satisfied: boolean,
): Prisma.SalesOrdersWhereInput {
	const itemBearingDelivery = {
		deletedAt: null,
		items: { some: { deletedAt: null } },
	} satisfies Prisma.OrderDeliveryWhereInput;
	const canonicalFulfillment = {
		AND: [
			{ deliveries: { some: itemBearingDelivery } },
			{
				deliveries: {
					none: {
						...itemBearingDelivery,
						OR: [
							{ status: { not: "completed" } },
							{
								NOT: {
									meta: {
										path: "$.dispatchCompletion.status",
										equals: "completed",
									},
								},
							},
						],
					},
				},
			},
		],
	} satisfies Prisma.SalesOrdersWhereInput;
	const administrativeMilestones =
		milestone === "PRODUCTION_COMPLETED"
			? (["PRODUCTION_COMPLETED", "FULFILLMENT_COMPLETED"] as const)
			: (["FULFILLMENT_COMPLETED"] as const);
	const alternatives: Prisma.SalesOrdersWhereInput[] = [
		canonicalFulfillment,
		{
			completionRecords: {
				some: {
					state: "ACTIVE",
					completionMethod: "STATUS_ONLY",
					milestone: { in: [...administrativeMilestones] },
				},
			},
		},
	];
	if (milestone === "PRODUCTION_COMPLETED") {
		alternatives.push(
			{
				stat: {
					some: {
						deletedAt: null,
						type: "prodCompleted",
						OR: [{ percentage: 100 }, { percentage: 0, total: 0 }],
					},
				},
			},
			{
				prodStatus: {
					in: [
						"completed",
						"complete",
						"ready",
						"N/A",
						"na",
						"not applicable",
						"none",
					],
				},
			},
		);
	}
	const where = { OR: alternatives } satisfies Prisma.SalesOrdersWhereInput;
	return satisfied ? where : { NOT: where };
}

function completionRevision(input: {
	id: number;
	status: string | null;
	prodStatus: string | null;
	updatedAt: Date | null;
	records: SalesCompletionRecordView[];
}) {
	return createHash("sha256")
		.update(
			JSON.stringify({
				id: input.id,
				status: input.status,
				prodStatus: input.prodStatus,
				updatedAt: input.updatedAt?.toISOString() ?? null,
				records: input.records.map((record) => ({
					id: record.id,
					milestone: record.milestone,
					method: record.completionMethod,
					state: record.state,
					updatedAt: record.updatedAt.toISOString(),
				})),
			}),
		)
		.digest("hex");
}

export function buildSalesCompletionActiveKey(input: {
	salesOrderId: number;
	milestone: SalesCompletionMilestone;
}) {
	return `${input.salesOrderId}:${input.milestone}`;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function hasCanonicalSalesFulfillmentEvidence(
	deliveries: Array<{
		status?: string | null;
		meta?: unknown;
		_count?: { items?: number | null } | null;
	}>,
) {
	const requiredDeliveries = deliveries.filter(
		(delivery) => Number(delivery._count?.items || 0) > 0,
	);
	return (
		requiredDeliveries.length > 0 &&
		requiredDeliveries.every((delivery) => {
			const completion = asRecord(asRecord(delivery.meta).dispatchCompletion);
			return (
				String(delivery.status || "")
					.trim()
					.toLowerCase() === "completed" && completion.status === "completed"
			);
		})
	);
}

export function resolveSalesCompletionProjection(input: {
	salesOrderId: number;
	orderNo: string;
	orderCreatedAt: Date | null;
	orderUpdatedAt: Date | null;
	orderStatus: string | null;
	legacyProductionStatus: string | null;
	operationalProductionCompleted: boolean;
	canonicalFulfilled: boolean;
	isCancelled: boolean;
	records: SalesCompletionRecordView[];
	now?: Date;
}): SalesCompletionProjection {
	const activeProductionRecord =
		input.records.find(
			(record) =>
				record.state === "ACTIVE" &&
				record.milestone === "PRODUCTION_COMPLETED",
		) ?? null;
	const activeFulfillmentRecord =
		input.records.find(
			(record) =>
				record.state === "ACTIVE" &&
				record.milestone === "FULFILLMENT_COMPLETED",
		) ?? null;
	const administrativeProductionCompleted =
		activeProductionRecord?.completionMethod === "STATUS_ONLY";
	const administrativeFulfillmentCompleted =
		activeFulfillmentRecord?.completionMethod === "STATUS_ONLY";
	const productionCompletionSatisfied =
		input.operationalProductionCompleted ||
		input.canonicalFulfilled ||
		administrativeProductionCompleted ||
		administrativeFulfillmentCompleted;
	const fulfillmentCompletionSatisfied =
		input.canonicalFulfilled || administrativeFulfillmentCompleted;

	let productionCompletionSource: SalesCompletionSource = "NONE";
	let productionCompletionMethod: SalesCompletionMethod | null = null;
	let productionEffectiveAt: Date | null = null;
	let productionRecordedAt: Date | null = null;
	if (input.operationalProductionCompleted || input.canonicalFulfilled) {
		productionCompletionSource = "OPERATIONAL_WORKFLOW";
		productionCompletionMethod = "FULL_WORKFLOW";
	} else if (administrativeProductionCompleted && activeProductionRecord) {
		productionCompletionSource = "STATUS_ONLY";
		productionCompletionMethod = activeProductionRecord.completionMethod;
		productionEffectiveAt = activeProductionRecord.effectiveAt;
		productionRecordedAt = activeProductionRecord.recordedAt;
	} else if (administrativeFulfillmentCompleted && activeFulfillmentRecord) {
		productionCompletionSource = "IMPLIED_BY_FULFILLMENT";
		productionCompletionMethod = activeFulfillmentRecord.completionMethod;
		productionEffectiveAt = activeFulfillmentRecord.effectiveAt;
		productionRecordedAt = activeFulfillmentRecord.recordedAt;
	}

	const fulfillmentCompletionSource: SalesCompletionSource =
		input.canonicalFulfilled
			? "OPERATIONAL_WORKFLOW"
			: administrativeFulfillmentCompleted
				? "STATUS_ONLY"
				: "NONE";
	const fulfillmentDisposition: SalesFulfillmentDisposition =
		input.canonicalFulfilled
			? "FULFILLED"
			: administrativeFulfillmentCompleted
				? "ADMINISTRATIVELY_COMPLETED"
				: "PENDING";
	const cancellationBlockedReason = activeFulfillmentRecord
		? "Cancel Fulfillment completion before cancelling Production completion."
		: input.canonicalFulfilled
			? "Canonical fulfillment independently satisfies Production completion."
			: null;
	const now = input.now ?? new Date();
	const isRecentOrder = input.orderCreatedAt
		? now.getTime() - input.orderCreatedAt.getTime() < 30 * 24 * 60 * 60 * 1000
		: false;

	return {
		salesOrderId: input.salesOrderId,
		orderNo: input.orderNo,
		orderCreatedAt: input.orderCreatedAt,
		isRecentOrder,
		revision: completionRevision({
			id: input.salesOrderId,
			status: input.orderStatus,
			prodStatus: input.legacyProductionStatus,
			updatedAt: input.orderUpdatedAt,
			records: input.records,
		}),
		operationalProductionCompleted: input.operationalProductionCompleted,
		canonicalFulfilled: input.canonicalFulfilled,
		productionCompletionSatisfied,
		fulfillmentCompletionSatisfied,
		fulfillmentDisposition,
		productionCompletionSource,
		fulfillmentCompletionSource,
		productionCompletionMethod,
		fulfillmentMethod: input.canonicalFulfilled
			? "FULL_WORKFLOW"
			: (activeFulfillmentRecord?.completionMethod ?? null),
		productionEffectiveAt,
		fulfillmentEffectiveAt: input.canonicalFulfilled
			? null
			: (activeFulfillmentRecord?.effectiveAt ?? null),
		productionRecordedAt,
		fulfillmentRecordedAt: input.canonicalFulfilled
			? null
			: (activeFulfillmentRecord?.recordedAt ?? null),
		availableActions: {
			markProductionStatusOnly:
				!input.isCancelled && !productionCompletionSatisfied,
			cancelProductionStatusOnly:
				activeProductionRecord?.completionMethod === "STATUS_ONLY" &&
				!cancellationBlockedReason,
			productionCancellationBlockedReason: cancellationBlockedReason,
			markFulfillmentStatusOnly:
				!input.isCancelled && !fulfillmentCompletionSatisfied,
			cancelFulfillmentStatusOnly:
				activeFulfillmentRecord?.completionMethod === "STATUS_ONLY",
		},
		activeProductionRecord,
		activeFulfillmentRecord,
		history: input.records,
	};
}

export function resolveSalesCompletionProjectionFromOrder(
	order: SalesCompletionOrderRow,
	options?: { now?: Date },
) {
	const aggregateStatus = overallStatus((order.stat ?? []) as never[]);
	const productionLifecycle = getSalesOrderLifecycleStatus({
		legacyProductionStatus: order.prodStatus,
		productionStatus: aggregateStatus.production.status,
	});
	const orderLifecycle = getSalesOrderLifecycleStatus({
		orderStatus: order.status,
	});
	return resolveSalesCompletionProjection({
		salesOrderId: order.id,
		orderNo: order.orderId,
		orderCreatedAt: order.createdAt,
		orderUpdatedAt: order.updatedAt,
		orderStatus: order.status,
		legacyProductionStatus: order.prodStatus,
		operationalProductionCompleted:
			hasCompletedProductionLifecycle(productionLifecycle),
		canonicalFulfilled: hasCanonicalSalesFulfillmentEvidence(
			order.deliveries ?? [],
		),
		isCancelled: orderLifecycle === "cancelled",
		records: order.completionRecords ?? [],
		now: options?.now,
	});
}

export function salesCompletionLabels(projection: SalesCompletionProjection) {
	return {
		production:
			projection.productionCompletionSource === "STATUS_ONLY"
				? "Completed — status only"
				: projection.productionCompletionSource === "IMPLIED_BY_FULFILLMENT"
					? "Completed — implied by Fulfillment status only"
					: projection.productionCompletionSatisfied
						? "Completed"
						: "Pending",
		fulfillment:
			projection.fulfillmentDisposition === "ADMINISTRATIVELY_COMPLETED"
				? "Administratively completed"
				: projection.fulfillmentDisposition === "FULFILLED"
					? "Fulfilled"
					: "Pending",
	};
}

export async function getSalesCompletionProjection(
	db: CompletionDb,
	input: z.infer<typeof salesCompletionProjectionInputSchema>,
) {
	const order = await db.salesOrders.findFirst({
		where: { id: input.salesOrderId, type: "order", deletedAt: null },
		select: {
			id: true,
			orderId: true,
			createdAt: true,
			updatedAt: true,
			status: true,
			prodStatus: true,
			stat: {
				where: { deletedAt: null },
			},
			deliveries: {
				where: { deletedAt: null },
				select: {
					status: true,
					meta: true,
					_count: { select: { items: true } },
				},
			},
			completionRecords: {
				orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
				select: salesCompletionRecordSelect,
			},
		},
	});
	if (!order) {
		throw new SalesCompletionError(
			"The sales order no longer exists.",
			"NOT_FOUND",
		);
	}
	return resolveSalesCompletionProjectionFromOrder(order);
}

function hasPrismaCode(error: unknown, codes: readonly string[]) {
	return (
		!!error &&
		typeof error === "object" &&
		codes.includes(String((error as { code?: unknown }).code ?? ""))
	);
}

async function runSerializable<T>(
	db: Database,
	operation: (tx: TransactionClient) => Promise<T>,
) {
	for (let attempt = 1; attempt <= 3; attempt += 1) {
		try {
			return await db.$transaction(operation, {
				isolationLevel: "Serializable",
			});
		} catch (error) {
			if (attempt < 3 && hasPrismaCode(error, ["P2028", "P2034"])) {
				continue;
			}
			throw error;
		}
	}
	throw new SalesCompletionError(
		"The completion change could not be saved.",
		"PERSISTENCE_FAILURE",
	);
}

function assertExpectedRevision(
	projection: SalesCompletionProjection,
	expectedRevision: string,
) {
	if (projection.revision !== expectedRevision) {
		throw new SalesCompletionError(
			"The order changed after the confirmation opened. Refresh and try again.",
			"STALE_STATE",
		);
	}
}

async function findMarkReplay(
	db: CompletionDb,
	input: z.infer<typeof markProductionCompletionStatusOnlySchema>,
) {
	const byRequest = await db.salesCompletionRecord.findUnique({
		where: { requestId: input.requestId },
		select: salesCompletionRecordSelect,
	});
	if (byRequest) {
		if (
			byRequest.salesOrderId !== input.salesOrderId ||
			byRequest.milestone !== "PRODUCTION_COMPLETED" ||
			byRequest.completionMethod !== "STATUS_ONLY"
		) {
			throw new SalesCompletionError(
				"That idempotency identity belongs to a different completion command.",
				"IDEMPOTENCY_CONFLICT",
			);
		}
		return byRequest;
	}
	return db.salesCompletionRecord.findUnique({
		where: {
			activeKey: buildSalesCompletionActiveKey({
				salesOrderId: input.salesOrderId,
				milestone: "PRODUCTION_COMPLETED",
			}),
		},
		select: salesCompletionRecordSelect,
	});
}

export async function markProductionCompletionStatusOnly(
	db: Database,
	input: z.infer<typeof markProductionCompletionStatusOnlySchema>,
	actor: { id: number; name: string },
) {
	try {
		return await runSerializable(db, async (tx) => {
			const replay = await findMarkReplay(tx, input);
			if (replay) {
				if (replay.state !== "ACTIVE") {
					throw new SalesCompletionError(
						"The earlier completion was cancelled; start a new confirmation.",
						"INVALID_TRANSITION",
					);
				}
				return {
					record: replay,
					projection: await getSalesCompletionProjection(tx, input),
					idempotentReplay: true,
				};
			}
			const projection = await getSalesCompletionProjection(tx, input);
			assertExpectedRevision(projection, input.expectedRevision);
			if (!projection.availableActions.markProductionStatusOnly) {
				throw new SalesCompletionError(
					"Production completion is already satisfied or this order cannot transition.",
					"INVALID_TRANSITION",
				);
			}
			const recordedAt = new Date();
			const record = await tx.salesCompletionRecord.create({
				data: {
					requestId: input.requestId,
					salesOrderId: input.salesOrderId,
					milestone: "PRODUCTION_COMPLETED",
					completionMethod: "STATUS_ONLY",
					state: "ACTIVE",
					activeKey: buildSalesCompletionActiveKey({
						salesOrderId: input.salesOrderId,
						milestone: "PRODUCTION_COMPLETED",
					}),
					effectiveAt: input.effectiveAt ?? null,
					recordedAt,
					recordedById: actor.id,
				},
				select: salesCompletionRecordSelect,
			});
			await tx.salesHistory.create({
				data: {
					salesId: input.salesOrderId,
					name: "Production completed — status only",
					authorName: actor.name,
					data: {
						event: "SALES_COMPLETION_MARKED",
						recordId: record.id,
						requestId: input.requestId,
						milestone: "PRODUCTION_COMPLETED",
						completionMethod: "STATUS_ONLY",
						recordedAt: recordedAt.toISOString(),
						effectiveAt: input.effectiveAt?.toISOString() ?? null,
						actorId: actor.id,
					} satisfies Prisma.InputJsonObject,
				},
			});
			return {
				record,
				projection: await getSalesCompletionProjection(tx, input),
				idempotentReplay: false,
			};
		});
	} catch (error) {
		if (error instanceof SalesCompletionError) throw error;
		if (hasPrismaCode(error, ["P2002"])) {
			const replay = await findMarkReplay(db, input);
			if (replay?.state === "ACTIVE") {
				return {
					record: replay,
					projection: await getSalesCompletionProjection(db, input),
					idempotentReplay: true,
				};
			}
		}
		throw new SalesCompletionError(
			"The status-only Production completion could not be saved.",
			"PERSISTENCE_FAILURE",
		);
	}
}

async function findCancellationReplay(
	db: CompletionDb,
	input: z.infer<typeof cancelProductionCompletionStatusOnlySchema>,
) {
	return db.salesCompletionRecord.findUnique({
		where: { cancellationRequestId: input.requestId },
		select: salesCompletionRecordSelect,
	});
}

export async function cancelProductionCompletionStatusOnly(
	db: Database,
	input: z.infer<typeof cancelProductionCompletionStatusOnlySchema>,
	actor: { id: number; name: string },
) {
	try {
		return await runSerializable(db, async (tx) => {
			const requestReplay = await findCancellationReplay(tx, input);
			if (requestReplay) {
				if (
					requestReplay.salesOrderId !== input.salesOrderId ||
					requestReplay.milestone !== "PRODUCTION_COMPLETED" ||
					requestReplay.completionMethod !== "STATUS_ONLY"
				) {
					throw new SalesCompletionError(
						"That idempotency identity belongs to a different cancellation command.",
						"IDEMPOTENCY_CONFLICT",
					);
				}
				return {
					record: requestReplay,
					projection: await getSalesCompletionProjection(tx, input),
					idempotentReplay: true,
				};
			}
			const projection = await getSalesCompletionProjection(tx, input);
			const activeRecord = projection.activeProductionRecord;
			if (!activeRecord) {
				const latestCancelled = projection.history.find(
					(record) =>
						record.milestone === "PRODUCTION_COMPLETED" &&
						record.completionMethod === "STATUS_ONLY" &&
						record.state === "CANCELLED",
				);
				if (latestCancelled) {
					return {
						record: latestCancelled,
						projection,
						idempotentReplay: true,
					};
				}
				throw new SalesCompletionError(
					"No active status-only Production completion exists.",
					"INVALID_TRANSITION",
				);
			}
			if (activeRecord.completionMethod !== "STATUS_ONLY") {
				throw new SalesCompletionError(
					"Full workflow completion must use workflow-aware cancellation.",
					"METHOD_MISMATCH",
				);
			}
			assertExpectedRevision(projection, input.expectedRevision);
			if (!projection.availableActions.cancelProductionStatusOnly) {
				throw new SalesCompletionError(
					projection.availableActions.productionCancellationBlockedReason ??
						"Production completion cannot be cancelled from the current state.",
					"INVALID_TRANSITION",
				);
			}
			const cancelledAt = new Date();
			const record = await tx.salesCompletionRecord.update({
				where: { id: activeRecord.id },
				data: {
					state: "CANCELLED",
					activeKey: null,
					cancellationRequestId: input.requestId,
					cancelledAt,
					cancelledById: actor.id,
					cancellationReason: input.reason?.trim() || null,
				},
				select: salesCompletionRecordSelect,
			});
			await tx.salesHistory.create({
				data: {
					salesId: input.salesOrderId,
					name: "Production status-only completion cancelled",
					authorName: actor.name,
					data: {
						event: "SALES_COMPLETION_CANCELLED",
						recordId: record.id,
						requestId: input.requestId,
						milestone: "PRODUCTION_COMPLETED",
						completionMethod: "STATUS_ONLY",
						cancelledAt: cancelledAt.toISOString(),
						cancellationReason: input.reason?.trim() || null,
						actorId: actor.id,
					} satisfies Prisma.InputJsonObject,
				},
			});
			return {
				record,
				projection: await getSalesCompletionProjection(tx, input),
				idempotentReplay: false,
			};
		});
	} catch (error) {
		if (error instanceof SalesCompletionError) throw error;
		if (hasPrismaCode(error, ["P2002"])) {
			const replay = await findCancellationReplay(db, input);
			if (replay) {
				return {
					record: replay,
					projection: await getSalesCompletionProjection(db, input),
					idempotentReplay: true,
				};
			}
		}
		throw new SalesCompletionError(
			"The status-only Production cancellation could not be saved.",
			"PERSISTENCE_FAILURE",
		);
	}
}

async function findFulfillmentMarkReplay(
	db: CompletionDb,
	input: z.infer<typeof markFulfillmentCompletionStatusOnlySchema>,
) {
	const byRequest = await db.salesCompletionRecord.findUnique({
		where: { requestId: input.requestId },
		select: salesCompletionRecordSelect,
	});
	if (byRequest) {
		if (
			byRequest.salesOrderId !== input.salesOrderId ||
			byRequest.milestone !== "FULFILLMENT_COMPLETED" ||
			byRequest.completionMethod !== "STATUS_ONLY"
		) {
			throw new SalesCompletionError(
				"That idempotency identity belongs to a different completion command.",
				"IDEMPOTENCY_CONFLICT",
			);
		}
		return byRequest;
	}
	return db.salesCompletionRecord.findUnique({
		where: {
			activeKey: buildSalesCompletionActiveKey({
				salesOrderId: input.salesOrderId,
				milestone: "FULFILLMENT_COMPLETED",
			}),
		},
		select: salesCompletionRecordSelect,
	});
}

export async function markFulfillmentCompletionStatusOnly(
	db: Database,
	input: z.infer<typeof markFulfillmentCompletionStatusOnlySchema>,
	actor: { id: number; name: string },
) {
	try {
		return await runSerializable(db, async (tx) => {
			const replay = await findFulfillmentMarkReplay(tx, input);
			if (replay) {
				if (replay.state !== "ACTIVE") {
					throw new SalesCompletionError(
						"The earlier completion was cancelled; start a new confirmation.",
						"INVALID_TRANSITION",
					);
				}
				return {
					record: replay,
					projection: await getSalesCompletionProjection(tx, input),
					idempotentReplay: true,
				};
			}
			const projection = await getSalesCompletionProjection(tx, input);
			assertExpectedRevision(projection, input.expectedRevision);
			if (!projection.availableActions.markFulfillmentStatusOnly) {
				throw new SalesCompletionError(
					"Fulfillment completion is already satisfied or this order cannot transition.",
					"INVALID_TRANSITION",
				);
			}
			const recordedAt = new Date();
			const record = await tx.salesCompletionRecord.create({
				data: {
					requestId: input.requestId,
					salesOrderId: input.salesOrderId,
					milestone: "FULFILLMENT_COMPLETED",
					completionMethod: "STATUS_ONLY",
					state: "ACTIVE",
					activeKey: buildSalesCompletionActiveKey({
						salesOrderId: input.salesOrderId,
						milestone: "FULFILLMENT_COMPLETED",
					}),
					effectiveAt: input.effectiveAt ?? null,
					recordedAt,
					recordedById: actor.id,
				},
				select: salesCompletionRecordSelect,
			});
			await tx.salesHistory.create({
				data: {
					salesId: input.salesOrderId,
					name: "Fulfillment completed — status only",
					authorName: actor.name,
					data: {
						event: "SALES_COMPLETION_MARKED",
						recordId: record.id,
						requestId: input.requestId,
						milestone: "FULFILLMENT_COMPLETED",
						completionMethod: "STATUS_ONLY",
						recordedAt: recordedAt.toISOString(),
						effectiveAt: input.effectiveAt?.toISOString() ?? null,
						actorId: actor.id,
					} satisfies Prisma.InputJsonObject,
				},
			});
			return {
				record,
				projection: await getSalesCompletionProjection(tx, input),
				idempotentReplay: false,
			};
		});
	} catch (error) {
		if (error instanceof SalesCompletionError) throw error;
		if (hasPrismaCode(error, ["P2002"])) {
			const replay = await findFulfillmentMarkReplay(db, input);
			if (replay?.state === "ACTIVE") {
				return {
					record: replay,
					projection: await getSalesCompletionProjection(db, input),
					idempotentReplay: true,
				};
			}
		}
		throw new SalesCompletionError(
			"The status-only Fulfillment completion could not be saved.",
			"PERSISTENCE_FAILURE",
		);
	}
}

// MySQL's serializable completion writes can acquire overlapping range locks
// through the shared projection. Keep the batch sequential so independent
// orders cannot repeatedly deadlock one another.
const SALES_COMPLETION_STATUS_ONLY_BATCH_CONCURRENCY = 1;

function buildBatchItemRequestId(input: {
	batchRequestId: string;
	milestone: SalesCompletionMilestone;
	salesOrderId: number;
}) {
	const digest = createHash("sha256")
		.update(`${input.batchRequestId}:${input.milestone}:${input.salesOrderId}`)
		.digest("hex");
	const uuidHex = `${digest.slice(0, 12)}5${digest.slice(13, 16)}8${digest.slice(17, 32)}`;
	return [
		uuidHex.slice(0, 8),
		uuidHex.slice(8, 12),
		uuidHex.slice(12, 16),
		uuidHex.slice(16, 20),
		uuidHex.slice(20, 32),
	].join("-");
}

async function markSalesCompletionStatusOnlyBatch(
	db: Database,
	input: z.infer<typeof markSalesCompletionStatusOnlyBulkSchema>,
	actor: { id: number; name: string },
	milestone: SalesCompletionMilestone,
): Promise<SalesCompletionStatusOnlyBulkResult> {
	const salesOrderIds = Array.from(new Set(input.salesOrderIds));
	const items: SalesCompletionStatusOnlyBulkItem[] = [];

	for (
		let offset = 0;
		offset < salesOrderIds.length;
		offset += SALES_COMPLETION_STATUS_ONLY_BATCH_CONCURRENCY
	) {
		const batch = salesOrderIds.slice(
			offset,
			offset + SALES_COMPLETION_STATUS_ONLY_BATCH_CONCURRENCY,
		);
		const batchItems = await Promise.all(
			batch.map(
				async (salesOrderId): Promise<SalesCompletionStatusOnlyBulkItem> => {
					try {
						const projection = await getSalesCompletionProjection(db, {
							salesOrderId,
						});
						const markInput = {
							salesOrderId,
							requestId: buildBatchItemRequestId({
								batchRequestId: input.requestId,
								milestone,
								salesOrderId,
							}),
							expectedRevision: projection.revision,
							effectiveAt: input.effectiveAt ?? null,
						};
						const result =
							milestone === "PRODUCTION_COMPLETED"
								? await markProductionCompletionStatusOnly(db, markInput, actor)
								: await markFulfillmentCompletionStatusOnly(
										db,
										markInput,
										actor,
									);
						return {
							salesOrderId,
							status: result.idempotentReplay ? "replayed" : "completed",
							code: null,
							message: null,
						};
					} catch (error) {
						const completionError =
							error instanceof SalesCompletionError ? error : null;
						return {
							salesOrderId,
							status:
								completionError?.code === "INVALID_TRANSITION"
									? "skipped"
									: "failed",
							code: completionError?.code ?? "PERSISTENCE_FAILURE",
							message:
								completionError?.message ??
								"The status-only completion could not be saved.",
						};
					}
				},
			),
		);
		items.push(...batchItems);
	}

	return {
		requested: salesOrderIds.length,
		completed: items.filter((item) => item.status === "completed").length,
		replayed: items.filter((item) => item.status === "replayed").length,
		skipped: items.filter((item) => item.status === "skipped").length,
		failed: items.filter((item) => item.status === "failed").length,
		items,
	};
}

export async function markProductionCompletionStatusOnlyBulk(
	db: Database,
	input: z.infer<typeof markProductionCompletionStatusOnlyBulkSchema>,
	actor: { id: number; name: string },
) {
	return markSalesCompletionStatusOnlyBatch(
		db,
		input,
		actor,
		"PRODUCTION_COMPLETED",
	);
}

export async function markFulfillmentCompletionStatusOnlyBulk(
	db: Database,
	input: z.infer<typeof markFulfillmentCompletionStatusOnlyBulkSchema>,
	actor: { id: number; name: string },
) {
	return markSalesCompletionStatusOnlyBatch(
		db,
		input,
		actor,
		"FULFILLMENT_COMPLETED",
	);
}

async function findFulfillmentCancellationReplay(
	db: CompletionDb,
	input: z.infer<typeof cancelFulfillmentCompletionStatusOnlySchema>,
) {
	return db.salesCompletionRecord.findUnique({
		where: { cancellationRequestId: input.requestId },
		select: salesCompletionRecordSelect,
	});
}

export async function cancelFulfillmentCompletionStatusOnly(
	db: Database,
	input: z.infer<typeof cancelFulfillmentCompletionStatusOnlySchema>,
	actor: { id: number; name: string },
) {
	try {
		return await runSerializable(db, async (tx) => {
			const requestReplay = await findFulfillmentCancellationReplay(tx, input);
			if (requestReplay) {
				if (
					requestReplay.salesOrderId !== input.salesOrderId ||
					requestReplay.milestone !== "FULFILLMENT_COMPLETED" ||
					requestReplay.completionMethod !== "STATUS_ONLY"
				) {
					throw new SalesCompletionError(
						"That idempotency identity belongs to a different cancellation command.",
						"IDEMPOTENCY_CONFLICT",
					);
				}
				return {
					record: requestReplay,
					projection: await getSalesCompletionProjection(tx, input),
					idempotentReplay: true,
				};
			}
			const projection = await getSalesCompletionProjection(tx, input);
			const activeRecord = projection.activeFulfillmentRecord;
			if (!activeRecord) {
				const latestCancelled = projection.history.find(
					(record) =>
						record.milestone === "FULFILLMENT_COMPLETED" &&
						record.completionMethod === "STATUS_ONLY" &&
						record.state === "CANCELLED",
				);
				if (latestCancelled) {
					return {
						record: latestCancelled,
						projection,
						idempotentReplay: true,
					};
				}
				throw new SalesCompletionError(
					"No active status-only Fulfillment completion exists.",
					"INVALID_TRANSITION",
				);
			}
			if (activeRecord.completionMethod !== "STATUS_ONLY") {
				throw new SalesCompletionError(
					"Full workflow completion must use workflow-aware cancellation.",
					"METHOD_MISMATCH",
				);
			}
			assertExpectedRevision(projection, input.expectedRevision);
			if (!projection.availableActions.cancelFulfillmentStatusOnly) {
				throw new SalesCompletionError(
					"Fulfillment completion cannot be cancelled from the current state.",
					"INVALID_TRANSITION",
				);
			}
			const cancelledAt = new Date();
			const record = await tx.salesCompletionRecord.update({
				where: { id: activeRecord.id },
				data: {
					state: "CANCELLED",
					activeKey: null,
					cancellationRequestId: input.requestId,
					cancelledAt,
					cancelledById: actor.id,
					cancellationReason: input.reason?.trim() || null,
				},
				select: salesCompletionRecordSelect,
			});
			await tx.salesHistory.create({
				data: {
					salesId: input.salesOrderId,
					name: "Fulfillment status-only completion cancelled",
					authorName: actor.name,
					data: {
						event: "SALES_COMPLETION_CANCELLED",
						recordId: record.id,
						requestId: input.requestId,
						milestone: "FULFILLMENT_COMPLETED",
						completionMethod: "STATUS_ONLY",
						cancelledAt: cancelledAt.toISOString(),
						cancellationReason: input.reason?.trim() || null,
						actorId: actor.id,
					} satisfies Prisma.InputJsonObject,
				},
			});
			return {
				record,
				projection: await getSalesCompletionProjection(tx, input),
				idempotentReplay: false,
			};
		});
	} catch (error) {
		if (error instanceof SalesCompletionError) throw error;
		if (hasPrismaCode(error, ["P2002"])) {
			const replay = await findFulfillmentCancellationReplay(db, input);
			if (replay) {
				return {
					record: replay,
					projection: await getSalesCompletionProjection(db, input),
					idempotentReplay: true,
				};
			}
		}
		throw new SalesCompletionError(
			"The status-only Fulfillment cancellation could not be saved.",
			"PERSISTENCE_FAILURE",
		);
	}
}

export type RecordFullWorkflowCompletionInput = {
	salesOrderId: number;
	milestone: SalesCompletionMilestone;
	actor: { id: number; name: string };
	requestId?: string;
	effectiveAt?: Date | null;
};

function hasFullWorkflowEvidence(
	projection: SalesCompletionProjection,
	milestone: SalesCompletionMilestone,
) {
	return milestone === "PRODUCTION_COMPLETED"
		? projection.operationalProductionCompleted
		: projection.canonicalFulfilled;
}

export async function recordFullWorkflowCompletionIfProven(
	db: Database,
	input: RecordFullWorkflowCompletionInput,
) {
	const requestId = input.requestId ?? randomUUID();
	try {
		return await runSerializable(db, async (tx) => {
			const projection = await getSalesCompletionProjection(tx, {
				salesOrderId: input.salesOrderId,
			});
			if (!hasFullWorkflowEvidence(projection, input.milestone)) {
				return {
					record: null,
					projection,
					recorded: false,
					idempotentReplay: false,
					reason: "EVIDENCE_NOT_PROVEN" as const,
				};
			}
			const activeRecord =
				input.milestone === "PRODUCTION_COMPLETED"
					? projection.activeProductionRecord
					: projection.activeFulfillmentRecord;
			if (activeRecord) {
				return {
					record: activeRecord,
					projection,
					recorded: activeRecord.completionMethod === "FULL_WORKFLOW",
					idempotentReplay: activeRecord.completionMethod === "FULL_WORKFLOW",
					reason:
						activeRecord.completionMethod === "FULL_WORKFLOW"
							? ("ALREADY_RECORDED" as const)
							: ("ACTIVE_STATUS_ONLY" as const),
				};
			}
			const recordedAt = new Date();
			const record = await tx.salesCompletionRecord.create({
				data: {
					requestId,
					salesOrderId: input.salesOrderId,
					milestone: input.milestone,
					completionMethod: "FULL_WORKFLOW",
					state: "ACTIVE",
					activeKey: buildSalesCompletionActiveKey({
						salesOrderId: input.salesOrderId,
						milestone: input.milestone,
					}),
					effectiveAt: input.effectiveAt ?? null,
					recordedAt,
					recordedById: input.actor.id,
				},
				select: salesCompletionRecordSelect,
			});
			await tx.salesHistory.create({
				data: {
					salesId: input.salesOrderId,
					name: `${input.milestone === "PRODUCTION_COMPLETED" ? "Production" : "Fulfillment"} completed — full workflow`,
					authorName: input.actor.name,
					data: {
						event: "SALES_COMPLETION_MARKED",
						recordId: record.id,
						requestId,
						milestone: input.milestone,
						completionMethod: "FULL_WORKFLOW",
						recordedAt: recordedAt.toISOString(),
						effectiveAt: input.effectiveAt?.toISOString() ?? null,
						actorId: input.actor.id,
					} satisfies Prisma.InputJsonObject,
				},
			});
			return {
				record,
				projection: await getSalesCompletionProjection(tx, {
					salesOrderId: input.salesOrderId,
				}),
				recorded: true,
				idempotentReplay: false,
				reason: "RECORDED" as const,
			};
		});
	} catch (error) {
		if (error instanceof SalesCompletionError) throw error;
		if (hasPrismaCode(error, ["P2002"])) {
			const projection = await getSalesCompletionProjection(db, {
				salesOrderId: input.salesOrderId,
			});
			const activeRecord =
				input.milestone === "PRODUCTION_COMPLETED"
					? projection.activeProductionRecord
					: projection.activeFulfillmentRecord;
			if (activeRecord) {
				return {
					record: activeRecord,
					projection,
					recorded: activeRecord.completionMethod === "FULL_WORKFLOW",
					idempotentReplay: activeRecord.completionMethod === "FULL_WORKFLOW",
					reason:
						activeRecord.completionMethod === "FULL_WORKFLOW"
							? ("ALREADY_RECORDED" as const)
							: ("ACTIVE_STATUS_ONLY" as const),
				};
			}
		}
		throw new SalesCompletionError(
			"Full-workflow completion provenance could not be saved.",
			"PERSISTENCE_FAILURE",
		);
	}
}

export async function cancelFullWorkflowCompletionInTransaction(
	tx: TransactionClient,
	input: {
		salesOrderId: number;
		milestone: SalesCompletionMilestone;
		requestId: string;
		reason: string;
		cancelledAt: Date;
		actor: { id: number; name: string };
	},
) {
	const record = await tx.salesCompletionRecord.findUnique({
		where: {
			activeKey: buildSalesCompletionActiveKey({
				salesOrderId: input.salesOrderId,
				milestone: input.milestone,
			}),
		},
		select: salesCompletionRecordSelect,
	});
	if (!record || record.completionMethod !== "FULL_WORKFLOW") return null;
	const cancelled = await tx.salesCompletionRecord.update({
		where: { id: record.id },
		data: {
			state: "CANCELLED",
			activeKey: null,
			cancellationRequestId: input.requestId,
			cancelledAt: input.cancelledAt,
			cancelledById: input.actor.id,
			cancellationReason: input.reason,
		},
		select: salesCompletionRecordSelect,
	});
	await tx.salesHistory.create({
		data: {
			salesId: input.salesOrderId,
			name: `${input.milestone === "PRODUCTION_COMPLETED" ? "Production" : "Fulfillment"} full-workflow completion provenance cancelled`,
			authorName: input.actor.name,
			data: {
				event: "SALES_COMPLETION_CANCELLED",
				recordId: cancelled.id,
				requestId: input.requestId,
				milestone: input.milestone,
				completionMethod: "FULL_WORKFLOW",
				cancelledAt: input.cancelledAt.toISOString(),
				cancellationReason: input.reason,
				actorId: input.actor.id,
			} satisfies Prisma.InputJsonObject,
		},
	});
	return cancelled;
}
