import { createHash } from "node:crypto";
import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import { DB_TRANSACTION_PROFILES } from "@gnd/db/transactions";
import { AppError } from "@gnd/errors";
import {
	createInboundShipmentFromDemands,
	ensureSelectedInboundDemandsForStockComponents,
	markSalesOrdersAvailableWhenInboundDemandResolved,
	receiveInboundShipment,
} from "@gnd/inventory/inbound";
import { z } from "zod";
import {
	getProductionAvailability,
	AVAILABILITY_ALLOCATION_NOTE,
	type ProductionAvailabilityActor,
} from "./production-availability-query";
import {
	productionAvailabilitySaveSchema,
	receivedDateToTimestamp,
	resolveAvailabilitySelections,
} from "./production-availability-contract";
import { scopeFor } from "./production-inbound";
import { confirmProductionInboundAllocations } from "./production-inbound-allocation";
import { reconcileProductionInboundReviews } from "./production-inbound-review";
import { allocateReceivedInboundToBackordersInTransaction } from "./sales-fulfillment-plan";
import { getSalesPipelineSnapshots } from "./sales-pipeline-order";
import { refreshSalesOrderListProjections } from "./order-list-projection-builder";
import { assertSpecialOrderOperationAllowed } from "./special-order";

export { getProductionAvailability, productionAvailabilitySaveSchema };
export type { ProductionAvailabilityActor };
const resultSchema = z.object({
	salesOrderId: z.number(),
	inboundId: z.number(),
	receivedQty: z.number(),
	remainingQty: z.number(),
	needsReview: z.boolean(),
});
function conflict(message: string): never {
	throw new AppError({ code: "CONFLICT", publicMessage: message });
}

export async function getProductionAvailabilitySuppliers(
	db: Db | TransactionClient,
	salesOrderId: number,
	actor: ProductionAvailabilityActor,
) {
	const scope = await scopeFor(db, salesOrderId, actor);
	if (
		!(actor.canViewAll
			? actor.canMarkAvailable
			: scope.policy.workerCanReceiveInbound)
	)
		throw new AppError({
			code: "PERMISSION_DENIED",
			publicMessage: "You cannot mark materials available.",
		});
	return db.supplier.findMany({
		where: { deletedAt: null },
		select: { id: true, name: true },
		orderBy: [{ name: "asc" }, { id: "asc" }],
	});
}

export async function markProductionMaterialsAvailable(
	db: Db,
	rawInput: z.infer<typeof productionAvailabilitySaveSchema>,
	resolveActor: (tx: TransactionClient) => Promise<ProductionAvailabilityActor>,
) {
	const input = productionAvailabilitySaveSchema.parse(rawInput);
	const receivedAt = receivedDateToTimestamp(input.receivedDate);
	const requestHash = createHash("sha256")
		.update(JSON.stringify(input))
		.digest("hex");
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
			const actor = await resolveActor(tx);
			// Serializes replay identities across different orders for this actor as well.
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM Users WHERE id=${actor.id} FOR UPDATE`,
			);
			const scope = await scopeFor(tx, input.salesOrderId, actor);
			if (
				!(actor.canViewAll
					? actor.canMarkAvailable
					: scope.policy.workerCanReceiveInbound)
			)
				throw new AppError({
					code: "PERMISSION_DENIED",
					publicMessage: "You cannot mark materials available.",
				});
			const prior = await tx.event.findFirst({
				where: {
					type: "production_materials_available",
					userId: actor.id,
					data: { path: "$.idempotencyKey", equals: input.idempotencyKey },
				},
				select: { data: true },
			});
			if (prior) {
				const audit = prior.data as { requestHash?: string; result?: unknown };
				if (audit.requestHash !== requestHash)
					conflict(
						"This availability request was already used with different details.",
					);
				return { ...resultSchema.parse(audit.result), replayed: true };
			}
			await tx.$queryRaw(
				Prisma.sql`SELECT c.id FROM LineItemComponents c JOIN LineItem l ON l.id=c.lineItemId WHERE l.saleId=${input.salesOrderId} ORDER BY c.id FOR UPDATE`,
			);
			const preview = await getProductionAvailability(
				tx,
				input.salesOrderId,
				actor,
			);
			if (preview.revision !== input.expectedRevision)
				conflict(
					"Material quantities or inbound information changed. Refresh and try again.",
				);
			if (!preview.canMarkAvailable)
				conflict(
					"No materials can be marked available for this order right now.",
				);
			const selections = resolveAvailabilitySelections(
				preview.needs,
				input.selection,
			);
			const componentIds = [
				...new Set(
					selections.flatMap((selection) => selection.lineItemComponentIds),
				),
			].sort((a, b) => a - b);
			if (input.supplierId != null) {
				const suppliers = await tx.$queryRaw<Array<{ id: number }>>(
					Prisma.sql`SELECT id FROM Supplier WHERE id=${input.supplierId} AND deletedAt IS NULL FOR UPDATE`,
				);
				if (!suppliers.length)
					conflict(
						"The selected supplier is unavailable. Choose another supplier or N/A.",
					);
			}
			await assertSpecialOrderOperationAllowed(tx, {
				salesOrderId: input.salesOrderId,
				operation: "PURCHASING",
				actorUserId: actor.id,
				authorName: String(actor.id),
				source: "production.mark-materials-available",
			});
			const priorAllocations = await tx.stockAllocation.findMany({
				where: { lineItemComponentId: { in: componentIds } },
				select: { id: true },
			});
			const demandIds = await ensureSelectedInboundDemandsForStockComponents(
				{ db: tx },
				selections,
			);
			const demands = await tx.inboundDemand.findMany({
				where: { id: { in: demandIds } },
				select: {
					id: true,
					qty: true,
					qtyReceived: true,
					lineItemComponentId: true,
				},
			});
			const expectedQty = selections.reduce(
				(sum, selection) => sum + selection.qty,
				0,
			);
			if (
				Math.abs(
					demands.reduce(
						(sum, demand) =>
							sum + Number(demand.qty) - Number(demand.qtyReceived),
						0,
					) - expectedQty,
				) > 0.000001
			)
				conflict(
					"The selected materials changed. Refresh before marking them available.",
				);
			const shipment = await createInboundShipmentFromDemands(tx, {
				creatorUserId: actor.id,
				supplierId: input.supplierId,
				reference: preview.orderNumber,
				demandIds,
				status: "pending",
			});
			const receipt = await receiveInboundShipment(tx, {
				inboundId: shipment.inboundId,
				receivedAt,
				authorName: String(actor.id),
			});
			if (
				receipt.skippedItemCount ||
				Math.abs(receipt.newlyReceivedQty - expectedQty) > 0.000001
			)
				conflict("The receipt quantities changed. No availability was saved.");
			await confirmProductionInboundAllocations(tx, componentIds);

			// Apply only newly received demands, one at a time: no history replay
			// and no silent truncation by the allocator's page limit.
			for (const demand of demands) {
				const applied = await allocateReceivedInboundToBackordersInTransaction(
					tx,
					{
						salesOrderId: input.salesOrderId,
						inboundDemandIds: [demand.id],
						limit: 1,
						note: AVAILABILITY_ALLOCATION_NOTE,
						authorName: String(actor.id),
					},
				);
				if (applied.skippedDemandCount > applied.alreadyCoveredDemandCount)
					conflict(
						"These materials need inventory review before availability can be saved.",
					);
			}

			const review = await reconcileProductionInboundReviews(tx, {
				salesOrderId: input.salesOrderId,
				componentIds,
				actorId: actor.id,
				authorizedAssignmentIds: actor.canViewAll
					? null
					: scope.assignments.map((assignment) => assignment.id),
			});
			await markSalesOrdersAvailableWhenInboundDemandResolved(tx, [
				input.salesOrderId,
			]);
			const after = await getProductionAvailability(
				tx,
				input.salesOrderId,
				actor,
			);
			const result = {
				salesOrderId: input.salesOrderId,
				inboundId: shipment.inboundId,
				receivedQty: expectedQty,
				remainingQty: after.pendingQty,
				needsReview: review.skippedReviewIds.length > 0,
			};
			const allocationReceipts = await tx.stockAllocation.findMany({
				where: {
					lineItemComponentId: { in: componentIds },
					id: { notIn: priorAllocations.map((allocation) => allocation.id) },
					notes: AVAILABILITY_ALLOCATION_NOTE,
				},
				select: { id: true, qty: true, inventoryStockId: true, lineItemComponentId: true },
			});
			await tx.event.create({
				data: {
					type: "production_materials_available",
					userId: actor.id,
					data: {
						version: 1,
						idempotencyKey: input.idempotencyKey,
						requestHash,
						result,
						salesOrderId: input.salesOrderId,
						inboundId: shipment.inboundId,
						supplierId: input.supplierId,
						receivedDate: input.receivedDate,
						receivedAt: receivedAt.toISOString(),
						selections,
						allocationReceipts,
						note: input.note ?? null,
					},
				},
			});
			await tx.salesHistory.create({
				data: {
					salesId: input.salesOrderId,
					authorName: String(actor.id),
					name: "Materials marked available",
					data: {
						...result,
						supplierId: input.supplierId,
						receivedDate: input.receivedDate,
						note: input.note ?? null,
					},
				},
			});
			const pipeline = (
				await getSalesPipelineSnapshots(tx as Db, [input.salesOrderId])
			).get(input.salesOrderId);
			if (!pipeline?.freshness.evidenceUpdatedAt)
				conflict(
					"Material evidence could not be refreshed. No availability was saved.",
				);
			const projection = await refreshSalesOrderListProjections(tx as Db, [
				{
					salesOrderId: input.salesOrderId,
					sourceUpdatedAt: new Date(pipeline.freshness.evidenceUpdatedAt),
				},
			]);
			if (projection.persisted !== 1)
				conflict(
					"Material evidence changed during refresh. Retry availability.",
				);
			return { ...result, replayed: false };
		},
		{ ...DB_TRANSACTION_PROFILES.workflow, isolationLevel: "Serializable" },
	);
}
