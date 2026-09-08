import { AppError } from "@gnd/errors";
import { createHash } from "node:crypto";
import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import { DB_TRANSACTION_PROFILES } from "@gnd/db/transactions";
import { receiveInboundShipment } from "@gnd/inventory/inbound";
import { confirmProductionInboundAllocations } from "./production-inbound-allocation";
import { getProductionReceivingSettings } from "@gnd/settings";
import { z } from "zod";
import { canReceiveProductionInboundItem } from "./production-inbound-scope";
import { allocateReceivedInboundToBackordersInTransaction } from "./sales-fulfillment-plan";
import { getSalesPipelineSnapshots } from "./sales-pipeline-order";
import { refreshSalesOrderListProjections } from "./order-list-projection-builder";

type Client = Db | TransactionClient;
export type ProductionInboundActor = {
	id: number;
	canEditInbound: boolean;
	canViewAll: boolean;
};
export const productionInboundQuerySchema = z.object({
	salesOrderId: z.number().int().positive(),
	inboundId: z.number().int().positive().optional(),
	cursor: z.number().int().positive().optional(),
	take: z.number().int().min(1).max(20).default(10),
});
export const productionInboundReceiveSchema = z.object({
	salesOrderId: z.number().int().positive(),
	inboundId: z.number().int().positive(),
	expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
	idempotencyKey: z.string().uuid(),
});

async function scopeFor(
	db: Client,
	salesOrderId: number,
	actor: ProductionInboundActor,
) {
	const sale = await db.salesOrders.findFirst({
		where: { id: salesOrderId, deletedAt: null, type: "order" },
		select: { id: true, updatedAt: true },
	});
	if (!sale)
		throw new AppError({
			code: "CONFLICT",
			publicMessage: "The production order is unavailable.",
		});
	const assignments = await db.orderItemProductionAssignments.findMany({
		where: {
			orderId: salesOrderId,
			assignedToId: actor.id,
			deletedAt: null,
			item: { deletedAt: null },
			OR: [
				{ qtyAssigned: { gt: 0 } },
				{ lhQty: { gt: 0 } },
				{ rhQty: { gt: 0 } },
			],
		},
		select: {
			id: true,
			itemId: true,
			salesDoorId: true,
			salesItemControlUid: true,
			updatedAt: true,
			salesDoor: { select: { dimension: true } },
		},
	});
	if (!actor.canViewAll && !assignments.length)
		throw new AppError({
			code: "PERMISSION_DENIED",
			publicMessage: "No active assignment grants access to this order.",
		});
	const policy = await getProductionReceivingSettings(db);
	const assignmentScope = assignments.map((a) => ({
		itemId: a.itemId,
		dimension: a.salesDoor?.dimension ?? null,
		wholeItem:
			!a.salesDoorId &&
			!!a.salesItemControlUid &&
			!a.salesItemControlUid.startsWith("door-"),
	}));
	const components = await db.lineItemComponents.findMany({
		where: {
			status: { not: "cancelled" },
			parent: {
				saleId: salesOrderId,
				deletedAt: null,
				...(!actor.canViewAll
					? { salesItemId: { in: assignments.map((a) => a.itemId) } }
					: {}),
			},
		},
		select: {
			id: true,
			parent: { select: { salesItemId: true } },
			inventoryVariant: { select: { uid: true } },
		},
	});
	const componentIds = components
		.filter(
			(c) =>
				actor.canViewAll ||
				canReceiveProductionInboundItem({
					workerEnabled: true,
					canEditInbound: false,
					hasIssues: false,
					salesOrderId,
					assignments: assignmentScope,
					demands: [
						{
							saleId: salesOrderId,
							salesItemId: c.parent.salesItemId,
							variantUid: c.inventoryVariant?.uid ?? null,
						},
					],
				}),
		)
		.map((c) => c.id);
	return { sale, assignments, assignmentScope, policy, componentIds };
}
const shipmentSelect = {
	id: true,
	reference: true,
	status: true,
	updatedAt: true,
	deletedAt: true,
	supplier: { select: { name: true } },
	items: {
		where: { deletedAt: null },
		take: 51,
		orderBy: { id: "asc" },
		select: {
			id: true,
			qty: true,
			qtyGood: true,
			qtyIssue: true,
			updatedAt: true,
			inventoryVariant: {
				select: { uid: true, inventory: { select: { name: true } } },
			},
			issues: {
				where: {
					deletedAt: null,
					status: { notIn: ["resolved", "cancelled"] },
				},
				select: { id: true },
			},
			inboundDemands: {
				where: { deletedAt: null, status: { not: "cancelled" } },
				take: 201,
				select: {
					id: true,
					qty: true,
					qtyReceived: true,
					updatedAt: true,
					lineItemComponentId: true,
					lineItemComponent: {
						select: {
							status: true,
							parent: {
								select: { saleId: true, salesItemId: true, deletedAt: true },
							},
						},
					},
				},
			},
		},
	},
} satisfies Prisma.InboundShipmentSelect;

function scopedShipmentSelect(componentIds: number[]) {
	return {
		...shipmentSelect,
		items: {
			...shipmentSelect.items,
			where: {
				deletedAt: null,
				inboundDemands: {
					some: {
						deletedAt: null,
						status: { not: "cancelled" },
						lineItemComponentId: { in: componentIds },
					},
				},
			},
		},
	} satisfies Prisma.InboundShipmentSelect;
}

function presentShipment(
	shipment: Prisma.InboundShipmentGetPayload<{ select: typeof shipmentSelect }>,
	scope: Awaited<ReturnType<typeof scopeFor>>,
	actor: ProductionInboundActor,
) {
	const relevant = shipment.items;
	const items = relevant.map((item) => {
		const remaining = Math.max(
			0,
			item.qty - (item.qtyGood ?? 0) - (item.qtyIssue ?? 0),
		);
		const canReceive =
			remaining > 0 &&
			item.inboundDemands.length <= 200 &&
			!item.inboundDemands.some(
				(d) =>
					d.lineItemComponent.parent.deletedAt ||
					d.lineItemComponent.status === "cancelled",
			) &&
			canReceiveProductionInboundItem({
				salesOrderId: scope.sale.id,
				workerEnabled: scope.policy.workerCanReceiveInbound,
				canEditInbound: actor.canEditInbound,
				hasIssues: item.issues.length > 0 || (item.qtyIssue ?? 0) > 0,
				assignments: scope.assignmentScope,
				demands: item.inboundDemands.map((d) => ({
					saleId: d.lineItemComponent.parent.saleId,
					salesItemId: d.lineItemComponent.parent.salesItemId,
					variantUid: item.inventoryVariant.uid,
				})),
			});
		return {
			id: item.id,
			name: item.inventoryVariant.inventory.name,
			remaining,
			canReceive,
		};
	});
	const pending = items.filter((item) => item.remaining > 0);
	const canReceive =
		shipment.items.length <= 50 &&
		pending.length > 0 &&
		pending.every((item) => item.canReceive) &&
		!["closed", "cancelled", "completed"].includes(shipment.status);
	const revision = createHash("sha256")
		.update(
			JSON.stringify({
				shipment,
				scope: scope.assignments,
				policy: scope.policy,
			}),
		)
		.digest("hex");
	return {
		id: shipment.id,
		reference: shipment.reference,
		supplier: shipment.supplier?.name ?? "Supplier not specified",
		status: shipment.status,
		items: pending,
		canReceive,
		revision,
		reason: canReceive
			? null
			: "Open inbound to review receipt scope, quantities or access.",
	};
}

export async function getProductionPendingInbounds(
	db: Client,
	input: z.infer<typeof productionInboundQuerySchema>,
	actor: ProductionInboundActor,
) {
	const scope = await scopeFor(db, input.salesOrderId, actor);
	if (!scope.componentIds.length)
		return {
			count: 0,
			rows: [],
			nextCursor: null,
			receivingEnabled:
				actor.canEditInbound || scope.policy.workerCanReceiveInbound,
		};
	const predicate = Prisma.sql`s.deletedAt IS NULL AND s.status NOT IN ('closed','cancelled','completed') AND i.deletedAt IS NULL AND (i.qty - COALESCE(i.qtyGood,0) - COALESCE(i.qtyIssue,0)) > 0 AND d.deletedAt IS NULL AND d.status <> 'cancelled' AND d.lineItemComponentId IN (${Prisma.join(scope.componentIds)}) ${input.inboundId ? Prisma.sql`AND s.id=${input.inboundId}` : Prisma.empty}`;
	const [counts, ids] = await Promise.all([
		db.$queryRaw<Array<{ count: bigint }>>(
			Prisma.sql`SELECT COUNT(DISTINCT s.id) AS count FROM InboundShipment s JOIN InboundShipmentItem i ON i.inboundId=s.id JOIN InboundDemand d ON d.inboundShipmentItemId=i.id WHERE ${predicate}`,
		),
		db.$queryRaw<Array<{ id: number }>>(
			Prisma.sql`SELECT DISTINCT s.id FROM InboundShipment s JOIN InboundShipmentItem i ON i.inboundId=s.id JOIN InboundDemand d ON d.inboundShipmentItemId=i.id WHERE ${predicate} AND s.id > ${input.cursor ?? 0} ORDER BY s.id ASC LIMIT ${input.take + 1}`,
		),
	]);
	const page = ids.slice(0, input.take);
	const shipments = await db.inboundShipment.findMany({
		where: { id: { in: page.map((r) => r.id) } },
		select: scopedShipmentSelect(scope.componentIds),
		orderBy: { id: "asc" },
	});
	return {
		count: Number(counts[0]?.count ?? 0),
		receivingEnabled:
			actor.canEditInbound || scope.policy.workerCanReceiveInbound,
		rows: shipments.map((s) => presentShipment(s, scope, actor)),
		nextCursor: ids.length > input.take ? (page.at(-1)?.id ?? null) : null,
	};
}

export async function receiveProductionInbound(
	db: Db,
	input: z.infer<typeof productionInboundReceiveSchema>,
	resolveActor: (tx: TransactionClient) => Promise<ProductionInboundActor>,
) {
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM SalesOrders WHERE id=${input.salesOrderId} FOR UPDATE`,
			);
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM Settings WHERE type='sales-settings' AND deletedAt IS NULL FOR UPDATE`,
			);
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM OrderItemProductionAssignments WHERE orderId=${input.salesOrderId} ORDER BY id FOR UPDATE`,
			);
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM InboundShipment WHERE id=${input.inboundId} FOR UPDATE`,
			);
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM InboundShipmentItem WHERE inboundId=${input.inboundId} ORDER BY id FOR UPDATE`,
			);
			await tx.$queryRaw(
				Prisma.sql`SELECT d.id FROM InboundDemand d JOIN InboundShipmentItem i ON i.id=d.inboundShipmentItemId WHERE i.inboundId=${input.inboundId} ORDER BY d.id FOR UPDATE`,
			);
			const actor = await resolveActor(tx);
			const scope = await scopeFor(tx, input.salesOrderId, actor);
			if (!actor.canEditInbound && !scope.policy.workerCanReceiveInbound)
				throw new AppError({
					code: "PERMISSION_DENIED",
					publicMessage: "Worker inbound receiving is disabled.",
				});
			const prior = await tx.event.findFirst({
				where: {
					type: "production_inbound_received",
					userId: actor.id,
					data: { path: "$.idempotencyKey", equals: input.idempotencyKey },
				},
				select: { data: true },
			});
			if (prior) {
				const event = prior.data as Record<string, unknown>;
				if (
					event.salesOrderId !== input.salesOrderId ||
					event.inboundId !== input.inboundId
				)
					throw new AppError({
						code: "CONFLICT",
						publicMessage:
							"Receipt request identity belongs to another inbound.",
					});
				return {
					inboundId: input.inboundId,
					salesOrderId: input.salesOrderId,
					replayed: true,
					remainingBackorderQty:
						typeof event.remainingBackorderQty === "number"
							? event.remainingBackorderQty
							: null,
				};
			}
			const shipment = await tx.inboundShipment.findUniqueOrThrow({
				where: { id: input.inboundId },
				select: scopedShipmentSelect(scope.componentIds),
			});
			const preview = presentShipment(shipment, scope, actor);
			if (preview.revision !== input.expectedRevision)
				throw new AppError({
					code: "CONFLICT",
					publicMessage: "Inbound evidence changed. Refresh before receiving.",
				});
			if (!preview.canReceive)
				throw new AppError({
					code: "CONFLICT",
					publicMessage:
						preview.reason || "This inbound cannot be received here.",
				});
			const snapshots = await getSalesPipelineSnapshots(tx as Db, [
				input.salesOrderId,
			]);
			const pipeline = snapshots.get(input.salesOrderId);
			if (
				!pipeline ||
				pipeline.commercial.state !== "open" ||
				["completed", "administratively_completed"].includes(
					pipeline.fulfillment.state,
				)
			)
				throw new AppError({
					code: "CONFLICT",
					publicMessage: "This order is no longer open for receiving.",
				});
			const eligibleIds = new Set(preview.items.map((i) => i.id));
			const items = shipment.items.filter((i) => eligibleIds.has(i.id));
			const componentIds = [
				...new Set(
					items.flatMap((i) =>
						i.inboundDemands.map((d) => d.lineItemComponentId),
					),
				),
			].sort((a, b) => a - b);
			if (componentIds.length > 100)
				throw new AppError({
					code: "CONFLICT",
					publicMessage: "Open inbound to receive this larger shipment.",
				});
			const demandCount = await tx.inboundDemand.count({
				where: {
					deletedAt: null,
					status: { not: "cancelled" },
					lineItemComponentId: { in: componentIds },
				},
			});
			if (demandCount > 200)
				throw new AppError({
					code: "CONFLICT",
					publicMessage:
						"Open inbound to apply this larger set of material needs.",
				});
			const receipt = await receiveInboundShipment(tx, {
				inboundId: input.inboundId,
				authorName: String(actor.id),
				items: items.map((i) => ({
					inboundShipmentItemId: i.id,
					qtyGood: i.qty,
					qtyIssue: i.qtyIssue ?? 0,
				})),
			});
			if (receipt.skippedItemCount > 0)
				throw new AppError({
					code: "CONFLICT",
					publicMessage: "Receipt quantities changed. Refresh and try again.",
				});
			const approvedAllocationIds = await confirmProductionInboundAllocations(
				tx,
				componentIds,
			);
			const application =
				await allocateReceivedInboundToBackordersInTransaction(tx, {
					salesOrderId: input.salesOrderId,
					lineItemComponentIds: componentIds,
					limit: 200,
					authorName: String(actor.id),
				});
			if (
				application.skippedDemandCount > application.alreadyCoveredDemandCount
			)
				throw new AppError({
					code: "CONFLICT",
					publicMessage:
						"Material needs could not be applied. Open inbound to resolve the allocation.",
				});
			const appliedNeeds = await tx.lineItemComponents.findMany({
				where: { id: { in: componentIds }, status: { not: "cancelled" } },
				select: {
					qty: true,
					stockAllocations: {
						where: {
							deletedAt: null,
							status: { in: ["approved", "reserved", "picked", "consumed"] },
						},
						select: { qty: true },
					},
				},
			});
			const remainingBackorderQty = appliedNeeds.reduce(
				(total, need) =>
					total +
					Math.max(
						0,
						Number(need.qty) -
							need.stockAllocations.reduce(
								(allocated, allocation) => allocated + allocation.qty,
								0,
							),
					),
				0,
			);
			await tx.event.create({
				data: {
					type: "production_inbound_received",
					userId: actor.id,
					data: {
						version: 1,
						idempotencyKey: input.idempotencyKey,
						salesOrderId: input.salesOrderId,
						inboundId: input.inboundId,
						policyRevision: scope.policy.revision,
						expectedRevision: input.expectedRevision,
						itemIds: [...eligibleIds],
						componentIds,
						receivedItems: items.map((item) => ({
							id: item.id,
							previousGood: item.qtyGood ?? 0,
							receivedGood: item.qty,
						})),
						allocatedQty: application.allocatedQty,
						remainingBackorderQty,
						approvedAllocationIds,
					},
				},
			});
			const refreshedPipeline = (
				await getSalesPipelineSnapshots(tx as Db, [input.salesOrderId])
			).get(input.salesOrderId);
			const evidenceUpdatedAt = refreshedPipeline?.freshness.evidenceUpdatedAt;
			if (!evidenceUpdatedAt)
				throw new AppError({
					code: "CONFLICT",
					publicMessage:
						"Material evidence could not be refreshed. Try receiving again.",
				});
			const projection = await refreshSalesOrderListProjections(tx as Db, [
				{
					salesOrderId: input.salesOrderId,
					sourceUpdatedAt: new Date(evidenceUpdatedAt),
				},
			]);
			if (projection.persisted !== 1)
				throw new AppError({
					code: "CONFLICT",
					publicMessage:
						"Material evidence changed during refresh. Try receiving again.",
				});
			return {
				inboundId: input.inboundId,
				salesOrderId: input.salesOrderId,
				replayed: false,
				remainingBackorderQty,
			};
		},
		{ ...DB_TRANSACTION_PROFILES.workflow, isolationLevel: "Serializable" },
	);
}
