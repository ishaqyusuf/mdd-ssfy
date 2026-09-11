import type { Db, TransactionClient } from "@gnd/db";
import {
	fulfillmentBacklogEvidenceSelect,
	projectBacklogEvidence,
} from "../fulfillment-backlog-query";

const TERMINAL_FULFILLMENT_STATUSES = new Set(["completed", "delivered"]);
const NON_ACTIVE_FULFILLMENT_STATUSES = new Set([
	...TERMINAL_FULFILLMENT_STATUSES,
	"cancelled",
	"canceled",
]);
const SERIALIZABLE_RETRY_CODES = new Set(["P2028", "P2034"]);

export type FulfillmentDispatchResolution = {
	salesId: number;
	orderNo: string;
	dispatchId: number | null;
	dispatchIds?: number[];
	state: "ready" | "already_fulfilled";
	created: boolean;
};

function normalizeDispatchStatus(status: string | null | undefined) {
	return String(status || "")
		.trim()
		.toLowerCase();
}

function isSerializableRetry(error: unknown) {
	if (!error || typeof error !== "object") return false;
	return SERIALIZABLE_RETRY_CODES.has(
		String((error as { code?: unknown }).code || ""),
	);
}

export async function ensureSalesOrderFulfillmentDispatchInTransaction(
	tx: TransactionClient,
	input: {
		salesId: number;
		createdById: number;
	},
): Promise<FulfillmentDispatchResolution> {
	const sale = await tx.salesOrders.findFirstOrThrow({
		where: {
			id: input.salesId,
			type: "order",
			deletedAt: null,
		},
		select: {
			id: true,
			orderId: true,
			deliveredAt: true,
			deliveryOption: true,
			deliveryDueDate: true,
			status: true,
			deliveries: {
				where: { deletedAt: null },
				orderBy: [{ dueDate: "desc" }, { id: "desc" }],
				select: {
					id: true,
					status: true,
				},
			},
		},
	});
	const completedDispatch = sale.deliveries.find((dispatch) =>
		TERMINAL_FULFILLMENT_STATUSES.has(normalizeDispatchStatus(dispatch.status)),
	);

	const evidence = await tx.salesOrders.findUniqueOrThrow({
		where: { id: sale.id },
		select: fulfillmentBacklogEvidenceSelect,
	});
	const { projection } = projectBacklogEvidence(evidence);
	if (["cancelled", "canceled"].includes(normalizeDispatchStatus(sale.status)))
		throw new Error("This order is closed for new fulfillments.");
	if (evidence.completionRecords.length > 0) {
		return {
			salesId: sale.id,
			orderNo: sale.orderId,
			dispatchId: completedDispatch?.id ?? null,
			state: "already_fulfilled",
			created: false,
		};
	}
	if (!projection.resolved)
		throw new Error(
			"Review fulfillment quantities before completing this order.",
		);
	const fullyDelivered =
		projection.lines.length > 0 &&
		projection.lines.every(
			(line) =>
				line.delivered.qty >= line.ordered.qty &&
				line.delivered.lh >= line.ordered.lh &&
				line.delivered.rh >= line.ordered.rh,
		);
	const remainingScope = projection.lines
		.filter(
			(line) =>
				line.availableToAssign.qty +
					line.availableToAssign.lh +
					line.availableToAssign.rh >
				0,
		)
		.map((line) => ({ uid: line.uid, quantity: line.availableToAssign }));
	if (fullyDelivered) {
		return {
			salesId: sale.id,
			orderNo: sale.orderId,
			dispatchId: completedDispatch?.id ?? null,
			state: "already_fulfilled",
			created: false,
		};
	}
	const activeDispatches = sale.deliveries.filter(
		(dispatch) =>
			!NON_ACTIVE_FULFILLMENT_STATUSES.has(
				normalizeDispatchStatus(dispatch.status),
			),
	);
	const existingDispatch = activeDispatches[0];
	if (existingDispatch && !remainingScope.length) {
		return {
			salesId: sale.id,
			orderNo: sale.orderId,
			dispatchId: existingDispatch.id,
			dispatchIds: activeDispatches.map((dispatch) => dispatch.id),
			state: "ready",
			created: false,
		};
	}
	if (!remainingScope.length)
		throw new Error(
			"Review remaining fulfillment quantities before continuing.",
		);
	const dispatch = await tx.orderDelivery.create({
		data: {
			deliveryMode: sale.deliveryOption === "pickup" ? "pickup" : "delivery",
			createdBy: { connect: { id: input.createdById } },
			status: "queue",
			dueDate: sale.deliveryDueDate ?? null,
			meta: {
				fulfillmentAssignment: {
					version: 1,
					revision: 1,
					selectionMode: "all_remaining",
					lines: remainingScope,
				},
			},
			order: { connect: { id: sale.id } },
		},
		select: { id: true },
	});
	await tx.salesHistory.create({
		data: {
			id: crypto.randomUUID(),
			salesId: sale.id,
			name: "Fulfillment assigned",
			authorName: `User ${input.createdById}`,
			data: {
				event: "FULFILLMENT_ASSIGNED",
				source: "bulk_fulfillment",
				dispatchId: dispatch.id,
				actorId: input.createdById,
				driverId: null,
				targetDate: sale.deliveryDueDate?.toISOString() ?? null,
				plannedQty: remainingScope.reduce(
					(total, line) =>
						total + line.quantity.qty + line.quantity.lh + line.quantity.rh,
					0,
				),
				lines: remainingScope,
			},
		},
	});
	return {
		salesId: sale.id,
		orderNo: sale.orderId,
		dispatchId: dispatch.id,
		dispatchIds: [
			...activeDispatches.map((dispatch) => dispatch.id),
			dispatch.id,
		],
		state: "ready",
		created: true,
	};
}

export async function ensureSalesOrderFulfillmentDispatch(
	db: Db,
	input: {
		salesId: number;
		createdById: number;
		now?: Date;
		maxAttempts?: number;
	},
) {
	const maxAttempts = Math.max(1, Math.min(input.maxAttempts ?? 3, 5));
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			return await db.$transaction(
				(tx) =>
					ensureSalesOrderFulfillmentDispatchInTransaction(tx, {
						salesId: input.salesId,
						createdById: input.createdById,
					}),
				{ isolationLevel: "Serializable" },
			);
		} catch (error) {
			if (attempt >= maxAttempts || !isSerializableRetry(error)) throw error;
		}
	}
	throw new Error("Unable to resolve fulfillment dispatch.");
}
