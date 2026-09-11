import { isDriverAssignmentDestinationReady } from "./dispatch-manifest/driver-destination";
import { buildFulfillmentNotificationIntents } from "./fulfillment-notification-intents";
import { Prisma, type TransactionClient } from "@gnd/db";
import {
	fulfillmentBacklogEvidenceSelect,
	projectBacklogEvidence,
} from "./fulfillment-backlog-query";
import { buildFulfillmentAssignmentPlan } from "./fulfillment-assignment-plan";
import {
	createFulfillmentAssignmentSchema,
	fulfillmentAssignmentFingerprint,
	fulfillmentAssignmentRevision,
	type CreateFulfillmentAssignmentInput,
} from "./fulfillment-assignment-command";

/** Internal transaction step. Caller must authorize manager, driver, destination and order policy first. */
export async function createFulfillmentAssignmentInTransaction(
	tx: TransactionClient,
	rawInput: CreateFulfillmentAssignmentInput,
	actor: { id: number; name: string },
) {
	const input = createFulfillmentAssignmentSchema.parse(rawInput);
	await tx.$queryRaw(
		Prisma.sql`SELECT id FROM SalesOrders WHERE id=${input.salesId} FOR UPDATE`,
	);
	const fingerprint = fulfillmentAssignmentFingerprint(input);
	const existing = await tx.salesHistory.findUnique({
		where: { id: input.requestId },
		select: { salesId: true, data: true },
	});
	if (existing) {
		const data =
			existing.data &&
			typeof existing.data === "object" &&
			!Array.isArray(existing.data)
				? existing.data
				: {};
		if (
			existing.salesId !== input.salesId ||
			data.event !== "FULFILLMENT_ASSIGNED" ||
			data.fingerprint !== fingerprint ||
			typeof data.dispatchId !== "number"
		)
			throw new Error(
				"This request was already used for a different fulfillment command.",
			);
		return { fulfillmentId: data.dispatchId, idempotentReplay: true };
	}
	// Lock existing fulfillment headers in a deterministic order before reloading evidence.
	await tx.$queryRaw(
		Prisma.sql`SELECT id FROM OrderDelivery WHERE salesOrderId=${input.salesId} ORDER BY id FOR UPDATE`,
	);
	const order = await tx.salesOrders.findFirst({
		where: { id: input.salesId, deletedAt: null },
		select: {
			...fulfillmentBacklogEvidenceSelect,
			status: true,
			shippingAddress: true,
		},
	});
	if (!order) throw new Error("Order not found.");
	if (
		["cancelled", "canceled"].includes(String(order.status).toLowerCase()) ||
		order.completionRecords.length
	)
		throw new Error("This order is closed for new fulfillments.");
	if (
		input.driverId &&
		!isDriverAssignmentDestinationReady({
			primaryAddress: order.shippingAddress,
			deliveryMode: input.deliveryMode,
		})
	)
		throw new Error(
			"Confirm the delivery destination before assigning a driver.",
		);
	const { projection } = projectBacklogEvidence(order);
	const revision = fulfillmentAssignmentRevision({
		salesId: order.id,
		projection,
		fulfillments: order.deliveries,
	});
	if (revision !== input.expectedRevision)
		throw new Error(
			"Fulfillment quantities changed. Refresh the order before assigning.",
		);
	if (
		!projection.resolved ||
		!projection.lines.some(
			(line) =>
				line.availableToAssign.qty +
					line.availableToAssign.lh +
					line.availableToAssign.rh >
				0,
		)
	)
		throw new Error(
			"No confirmed remaining quantities are available to assign.",
		);
	const plan = buildFulfillmentAssignmentPlan({
		projection,
		selectionMode: input.selectionMode,
		selectedLines: input.lines,
	});
	const fulfillment = await tx.orderDelivery.create({
		data: {
			salesOrderId: input.salesId,
			createdById: actor.id,
			driverId: input.driverId,
			deliveryMode: input.deliveryMode,
			dueDate: input.dueDate
				? new Date(`${input.dueDate}T00:00:00.000Z`)
				: null,
			status: "queue",
			meta: { fulfillmentAssignment: plan.scope },
		},
		select: { id: true },
	});
	await tx.salesHistory.create({
		data: {
			id: input.requestId,
			salesId: input.salesId,
			name: "Fulfillment assigned",
			authorName: actor.name,
			data: {
				event: "FULFILLMENT_ASSIGNED",
				dispatchId: fulfillment.id,
				fingerprint,
				actorId: actor.id,
				notificationIntents: buildFulfillmentNotificationIntents({
					requestId: input.requestId,
					salesId: input.salesId,
					fulfillmentId: fulfillment.id,
					actorId: actor.id,
					driverId: input.driverId,
					changed: true,
					kind: "created",
					dueDate: input.dueDate,
					deliveryMode: input.deliveryMode,
				}),
				driverId: input.driverId,
				targetDate: input.dueDate,
				plannedQty: plan.plannedQty,
				backlogQty: plan.backlogQty,
			},
		},
	});
	return { fulfillmentId: fulfillment.id, idempotentReplay: false };
}
