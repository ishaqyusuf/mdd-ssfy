import { Prisma, type Db, type TransactionClient } from "@gnd/db";
import { DB_TRANSACTION_PROFILES } from "@gnd/db/transactions";
import { AppError } from "@gnd/errors";
import { z } from "zod";
import { scopeFor, type ProductionInboundActor } from "./production-inbound";
import {
	captureProductionReceiptState,
	receiptEvidenceFingerprint,
	type ProductionReceiptState,
} from "./production-inbound-audit";
import { compensateProductionReceipt } from "./production-inbound-compensation";
import { validateProductionReceiptBefore } from "./production-inbound-audit-validation";
import { getSalesPipelineSnapshots } from "./sales-pipeline-order";
import { refreshSalesOrderListProjections } from "./order-list-projection-builder";

export const productionInboundCancelSchema = z.object({
	salesOrderId: z.number().int().positive(),
	receiptId: z.number().int().positive(),
	idempotencyKey: z.string().uuid(),
});
const receiptScopeSchema = z.object({
	salesOrderId: z.number().int().positive(),
	inboundId: z.number().int().positive(),
	componentIds: z.array(z.number().int().positive()).min(1).max(100),
	variantIds: z.array(z.number().int().positive()).min(1).max(100),
});

function conflict(message: string): never {
	throw new AppError({ code: "CONFLICT", publicMessage: message });
}

// Only top-level database timestamp columns are revived; JSON evidence stays JSON.
function restoreDates(value: unknown): ProductionReceiptState {
	const result = structuredClone(value) as Record<string, any>;
	for (const group of Object.values(result)) {
		for (const row of Array.isArray(group) ? group : [group]) {
			for (const [key, val] of Object.entries(row))
				if (key.endsWith("At") && typeof val === "string")
					row[key] = new Date(val);
		}
	}
	return result as ProductionReceiptState;
}

export async function cancelProductionInbound(
	db: Db,
	input: z.infer<typeof productionInboundCancelSchema>,
	resolveActor: (tx: TransactionClient) => Promise<ProductionInboundActor>,
) {
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM SalesOrders WHERE id=${input.salesOrderId} FOR UPDATE`,
			);
			const actor = await resolveActor(tx);
			if (!actor.canViewAll || !actor.canEditInbound)
				throw new AppError({
					code: "PERMISSION_DENIED",
					publicMessage:
						"Only an administrator with inbound access can cancel a receipt.",
				});
			await scopeFor(tx, input.salesOrderId, actor);
			const event = await tx.event.findFirst({
				where: {
					id: input.receiptId,
					type: "production_inbound_received",
					deletedAt: null,
				},
			});
			const data = event?.data as any;
			if (!event || data?.salesOrderId !== input.salesOrderId)
				conflict("Receipt is unavailable for this order.");
			const reusedKey = await tx.event.findFirst({
				where: {
					type: "production_inbound_cancelled",
					userId: actor.id,
					data: { path: "$.idempotencyKey", equals: input.idempotencyKey },
				},
			});
			if (reusedKey && (reusedKey.data as any).receiptId !== input.receiptId)
				conflict("Cancellation request identity belongs to another receipt.");
			const prior = await tx.event.findFirst({
				where: {
					type: "production_inbound_cancelled",
					deletedAt: null,
					data: { path: "$.receiptId", equals: input.receiptId },
				},
			});
			if (prior)
				return {
					receiptId: input.receiptId,
					salesOrderId: input.salesOrderId,
					replayed: true,
				};
			const parsed = receiptScopeSchema.safeParse(data?.audit?.scope);
			if (
				data.version !== 2 ||
				!parsed.success ||
				!data.audit?.before?.order ||
				!data.audit?.after?.stockCommitments
			)
				conflict(
					"This receipt lacks reversal evidence. Open Inventory for review.",
				);
			const scope = parsed.data;
			if (
				scope.salesOrderId !== input.salesOrderId ||
				scope.inboundId !== data.inboundId
			)
				conflict("Receipt scope does not match its audit.");
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM InboundShipment WHERE id=${scope.inboundId} FOR UPDATE`,
			);
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM InboundShipmentItem WHERE inboundId=${scope.inboundId} ORDER BY id FOR UPDATE`,
			);
			await tx.$queryRaw(
				Prisma.sql`SELECT id FROM InventoryStock WHERE inventoryVariantId IN (${Prisma.join(scope.variantIds)}) ORDER BY id FOR UPDATE`,
			);
			const current = await captureProductionReceiptState(tx, scope);
			if (
				receiptEvidenceFingerprint(current) !==
				receiptEvidenceFingerprint(data.audit.after)
			)
				conflict(
					"This receipt's materials or production records have changed. Open Inventory to review before cancelling.",
				);
			await compensateProductionReceipt(tx, {
				before: restoreDates(
					validateProductionReceiptBefore(data.audit.before, current, scope),
				),
				after: current,
				receiptId: input.receiptId,
				actorId: actor.id,
				requestId: input.idempotencyKey,
			});
			const pipeline = (
				await getSalesPipelineSnapshots(tx as Db, [input.salesOrderId])
			).get(input.salesOrderId);
			if (!pipeline?.freshness.evidenceUpdatedAt)
				conflict(
					"Material evidence could not be refreshed. Cancellation was not applied.",
				);
			const projection = await refreshSalesOrderListProjections(tx as Db, [
				{
					salesOrderId: input.salesOrderId,
					sourceUpdatedAt: new Date(pipeline.freshness.evidenceUpdatedAt),
				},
			]);
			if (projection.persisted !== 1)
				conflict(
					"Production could not be refreshed. Cancellation was not applied.",
				);
			await tx.event.create({
				data: {
					type: "production_inbound_cancelled",
					userId: actor.id,
					data: {
						version: 1,
						receiptId: input.receiptId,
						salesOrderId: input.salesOrderId,
						inboundId: scope.inboundId,
						idempotencyKey: input.idempotencyKey,
					},
				},
			});
			return {
				receiptId: input.receiptId,
				salesOrderId: input.salesOrderId,
				replayed: false,
			};
		},
		{ ...DB_TRANSACTION_PROFILES.workflow, isolationLevel: "Serializable" },
	);
}
