import { Prisma, type TransactionClient } from "@gnd/db";
import {
	updateFulfillmentAssignmentSchema,
	fulfillmentAssignmentFingerprint,
	fulfillmentAssignmentRevision,
	type UpdateFulfillmentAssignmentInput,
} from "./fulfillment-assignment-command";
import { readFulfillmentAssignmentScope } from "./fulfillment-assignment-scope";
import { buildFulfillmentAssignmentPlan } from "./fulfillment-assignment-plan";
import {
	fulfillmentBacklogEvidenceSelect,
	projectBacklogEvidence,
} from "./fulfillment-backlog-query";
import { isDriverAssignmentDestinationReady } from "./dispatch-manifest/driver-destination";
import { buildFulfillmentNotificationIntents } from "./fulfillment-notification-intents";

/** Internal step; caller must authorize manager and driver, and supply an enclosing transaction. */
export async function updateFulfillmentAssignmentInTransaction(
	tx: TransactionClient,
	raw: UpdateFulfillmentAssignmentInput,
	actor: { id: number; name: string },
) {
	const { fulfillmentId, ...input } =
		updateFulfillmentAssignmentSchema.parse(raw);
	await tx.$queryRaw(
		Prisma.sql`SELECT id FROM SalesOrders WHERE id=${input.salesId} FOR UPDATE`,
	);
	const fingerprint = `${fulfillmentId}:${fulfillmentAssignmentFingerprint(input)}`;
	const replay = await tx.salesHistory.findUnique({
		where: { id: input.requestId },
		select: { salesId: true, data: true },
	});
	if (replay) {
		const data = record(replay.data);
		if (
			replay.salesId !== input.salesId ||
			data.event !== "FULFILLMENT_UPDATED" ||
			data.fingerprint !== fingerprint
		)
			throw new Error("This request was already used for another command.");
		return {
			fulfillmentId,
			idempotentReplay: true,
			changed: Boolean(data.changed),
			previousDriverId:
				typeof data.previousDriverId === "number"
					? data.previousDriverId
					: null,
		};
	}
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
	const current = await tx.orderDelivery.findFirst({
		where: { id: fulfillmentId, salesOrderId: input.salesId, deletedAt: null },
	});
	if (!order || !current)
		throw new Error("Fulfillment not found for this order.");
	if (
		order.completionRecords.length ||
		["cancelled", "canceled"].includes(String(order.status).toLowerCase())
	)
		throw new Error("This order is closed for fulfillment edits.");
	if (
		!["queue", "packing", "packing queue", "missing items", "packed"].includes(
			String(current.status).toLowerCase(),
		)
	)
		throw new Error(
			"This fulfillment is in progress or closed and cannot be edited.",
		);
	const original = projectBacklogEvidence(order).projection;
	if (
		fulfillmentAssignmentRevision({
			salesId: order.id,
			projection: original,
			fulfillments: order.deliveries,
		}) !== input.expectedRevision
	)
		throw new Error("Fulfillment quantities changed. Refresh before editing.");
	const scope = readFulfillmentAssignmentScope(current.meta).scope;
	if (!scope)
		throw new Error("Review existing fulfillment quantities before editing.");
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
	const editable = projectBacklogEvidence(order, {
		excludeDeliveryId: fulfillmentId,
	}).projection;
	const plan = buildFulfillmentAssignmentPlan({
		projection: editable,
		selectionMode: input.selectionMode,
		selectedLines: input.lines,
		revision: scope.revision + 1,
	});
	const physical = projectBacklogEvidence({
		...order,
		deliveries: order.deliveries.filter(
			(delivery) => delivery.id === fulfillmentId,
		),
	}).projection;
	const proposed = new Map(
		plan.scope.lines.map((line) => [line.uid, line.quantity]),
	);
	for (const line of physical.lines)
		for (const axis of ["qty", "lh", "rh"] as const) {
			if (
				(proposed.get(line.uid)?.[axis] ?? 0) <
				Math.max(line.packed[axis], line.delivered[axis])
			)
				throw new Error(
					"Unpack or return physical quantities before reducing this fulfillment.",
				);
		}
	const dueDate = input.dueDate
		? new Date(`${input.dueDate}T00:00:00.000Z`)
		: null;
	const scopeKey = (lines: typeof scope.lines) =>
		JSON.stringify([...lines].sort((a, b) => a.uid.localeCompare(b.uid)));
	const changed =
		current.driverId !== input.driverId ||
		current.deliveryMode !== input.deliveryMode ||
		(current.dueDate?.toISOString().slice(0, 10) ?? null) !== input.dueDate ||
		scope.selectionMode !== plan.scope.selectionMode ||
		scopeKey(scope.lines) !== scopeKey(plan.scope.lines);
	if (changed)
		await tx.orderDelivery.update({
			where: { id: fulfillmentId },
			data: {
				driverId: input.driverId,
				dueDate,
				deliveryMode: input.deliveryMode,
				meta: {
					...record(current.meta),
					fulfillmentAssignment: plan.scope,
				} as Prisma.InputJsonObject,
			},
		});
	await tx.salesHistory.create({
		data: {
			id: input.requestId,
			salesId: input.salesId,
			name: changed ? "Fulfillment updated" : "Fulfillment unchanged",
			authorName: actor.name,
			data: {
				event: "FULFILLMENT_UPDATED",
				dispatchId: fulfillmentId,
				fingerprint,
				changed,
				actorId: actor.id,
				notificationIntents: buildFulfillmentNotificationIntents({
					requestId: input.requestId,
					salesId: input.salesId,
					fulfillmentId,
					actorId: actor.id,
					driverId: input.driverId,
					previousDriverId: current.driverId,
					changed,
					kind: "updated",
					dueDate: input.dueDate,
					deliveryMode: input.deliveryMode,
				}),
				previousDriverId: current.driverId,
				driverId: input.driverId,
				targetDate: input.dueDate,
				plannedQty: plan.plannedQty,
				backlogQty: plan.backlogQty,
			},
		},
	});
	return {
		fulfillmentId,
		idempotentReplay: false,
		changed,
		previousDriverId: current.driverId,
	};
}
function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
