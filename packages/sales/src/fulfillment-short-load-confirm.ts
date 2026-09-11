import { assertNoPendingPackingReports } from "./packing-report-review/guard";
import { buildFulfillmentNotificationIntents } from "./fulfillment-notification-intents";
import { Prisma, type TransactionClient } from "@gnd/db";
import { z } from "zod";
import { fulfillmentAssignmentRevision } from "./fulfillment-assignment-command";
import {
	fulfillmentBacklogEvidenceSelect,
	projectBacklogEvidence,
} from "./fulfillment-backlog-query";
import { readFulfillmentAssignmentScope } from "./fulfillment-assignment-scope";
import { buildFulfillmentShortLoadPlan } from "./fulfillment-short-load-plan";
import { reconcileShortLoadInventoryInTransaction } from "./fulfillment-short-load-inventory-execute";

export const confirmFulfillmentShortLoadSchema = z
	.object({
		requestId: z.string().uuid(),
		salesId: z.number().int().positive(),
		fulfillmentId: z.number().int().positive(),
		expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
		expectedInventoryRevision: z.string().regex(/^[a-f0-9]{64}$/).optional(),
		physicalReturnsConfirmed: z.boolean().optional(),
	})
	.strict();

/** Internal transaction step. Caller must authorize the manager or current driver. */
export async function confirmFulfillmentShortLoadInTransaction(
	tx: TransactionClient,
	raw: z.infer<typeof confirmFulfillmentShortLoadSchema>,
	actor: { id: number; name: string },
) {
	const input = confirmFulfillmentShortLoadSchema.parse(raw);
	await tx.$queryRaw(
		Prisma.sql`SELECT id FROM SalesOrders WHERE id=${input.salesId} FOR UPDATE`,
	);
	const replay = await tx.salesHistory.findUnique({
		where: { id: input.requestId },
	});
	if (replay) {
		const data = record(replay.data);
		if (
			replay.salesId !== input.salesId ||
			data.event !== "FULFILLMENT_SHORT_LOAD_CONFIRMED" ||
			data.dispatchId !== input.fulfillmentId ||
			data.expectedRevision !== input.expectedRevision ||
			(data.expectedInventoryRevision ?? null) !== (input.expectedInventoryRevision ?? null) ||
			Boolean(data.physicalReturnsConfirmed) !== Boolean(input.physicalReturnsConfirmed)
		)
			throw new Error("This request was already used for another command.");
		return {
			fulfillmentId: input.fulfillmentId,
			releasedQty: Number(data.releasedQty),
			idempotentReplay: true,
		};
	}
	await tx.$queryRaw(
		Prisma.sql`SELECT id FROM OrderDelivery WHERE salesOrderId=${input.salesId} ORDER BY id FOR UPDATE`,
	);
	const order = await tx.salesOrders.findFirst({
		where: { id: input.salesId, deletedAt: null },
		select: { ...fulfillmentBacklogEvidenceSelect, status: true },
	});
	const delivery = order?.deliveries.find(
		(delivery) => delivery.id === input.fulfillmentId,
	);
	if (!order || !delivery)
		throw new Error("Fulfillment not found for this order.");
	if (
		order.completionRecords.length ||
		["cancelled", "canceled"].includes(String(order.status).toLowerCase())
	)
		throw new Error("This order is closed.");
	if (
		!["queue", "packing", "packing queue", "missing items", "packed"].includes(
			String(delivery.status).toLowerCase(),
		)
	)
		throw new Error("This fulfillment is in progress or closed.");
	const projection = projectBacklogEvidence(order).projection;
	if (
		!projection.resolved ||
		fulfillmentAssignmentRevision({
			salesId: order.id,
			projection,
			fulfillments: order.deliveries,
		}) !== input.expectedRevision
	)
		throw new Error(
			"Fulfillment changed. Refresh before confirming the short load.",
		);
	const activeAllocations = await tx.stockAllocation.count({
		where: {
			orderDeliveryId: input.fulfillmentId,
			deletedAt: null,
			status: { notIn: ["released", "cancelled"] },
		},
	});
	if (activeAllocations > 0 && !input.expectedInventoryRevision)
		throw new Error(
			"Refresh the inventory preview before releasing this short load.",
		);
	if (
		delivery.items.some(
			(item) =>
				item.packingStatus !== "packed" &&
				item.packingStatus !== "unpacked" &&
				Number(item.qty || 0) +
					Number(item.lhQty || 0) +
					Number(item.rhQty || 0) >
					0,
		)
	)
		throw new Error(
			"Resolve pending packing before confirming the short load.",
		);
	await assertNoPendingPackingReports(tx, {
		dispatchId: input.fulfillmentId,
		salesOrderId: input.salesId,
	});
	const scope = readFulfillmentAssignmentScope(delivery.meta).scope;
	if (!scope)
		throw new Error(
			"Review fulfillment quantities before confirming the short load.",
		);
	const physical = projectBacklogEvidence({
		...order,
		deliveries: [delivery],
	}).projection;
	const plan = buildFulfillmentShortLoadPlan({
		meta: delivery.meta,
		expectedScopeRevision: scope.revision,
		lines: physical.lines
			.filter((line) => line.packed.qty + line.packed.lh + line.packed.rh > 0)
			.map((line) => ({ uid: line.uid, quantity: line.packed })),
	});
	const inventory = input.expectedInventoryRevision
		? await reconcileShortLoadInventoryInTransaction(tx, {
			...input,
			expectedInventoryRevision: input.expectedInventoryRevision,
			physicalReturnsConfirmed: input.physicalReturnsConfirmed === true,
		})
		: null;
	if (plan.changed)
		await tx.orderDelivery.update({
			where: { id: delivery.id },
			data: {
				status: plan.scope.lines.length > 0 ? "packed" : "packing queue",
				meta: {
					...record(delivery.meta),
					fulfillmentAssignment: plan.scope,
				} as Prisma.InputJsonObject,
			},
		});
	const notificationContext = plan.changed
		? await tx.orderDelivery.findFirstOrThrow({
			where: { id: delivery.id, salesOrderId: input.salesId, deletedAt: null },
			select: { driverId: true, deliveryMode: true, dueDate: true },
		})
		: null;
	await tx.salesHistory.create({
		data: {
			id: input.requestId,
			salesId: input.salesId,
			name: "Fulfillment short load confirmed",
			authorName: actor.name,
			data: {
				event: "FULFILLMENT_SHORT_LOAD_CONFIRMED",
				dispatchId: delivery.id,
				actorId: actor.id,
				notificationIntents: buildFulfillmentNotificationIntents({
					requestId: input.requestId,
					salesId: input.salesId,
					fulfillmentId: delivery.id,
					actorId: actor.id,
					driverId: notificationContext?.driverId ?? null,
					previousDriverId: notificationContext?.driverId ?? null,
					kind: "updated",
					changed: plan.changed,
					dueDate: notificationContext?.dueDate?.toISOString().slice(0, 10) ?? null,
					deliveryMode: notificationContext?.deliveryMode === "pickup" ? "pickup" : "delivery",
				}),
				expectedRevision: input.expectedRevision,
				expectedInventoryRevision: input.expectedInventoryRevision ?? null,
				physicalReturnsConfirmed: input.physicalReturnsConfirmed === true,
				inventoryReleases: inventory?.releases ?? [],
				originalScope: plan.originalScope,
				scope: plan.scope,
				releasedQty: plan.releasedQty,
				lines: plan.lines,
			},
		},
	});
	return {
		fulfillmentId: delivery.id,
		releasedQty: plan.releasedQty,
		idempotentReplay: false,
	};
}
function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
