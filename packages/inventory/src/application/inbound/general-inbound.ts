import { createHash } from "node:crypto";
import { type Db, Prisma } from "@gnd/db";
import { z } from "zod";
import { StockAdjustmentError } from "../stock/stock-adjustment";
import { createInboundShipment } from "./inbound-demand";

export const generalInboundSchema = z.object({
	idempotencyKey: z.string().uuid(),
	supplierId: z.number().int().positive().nullable().optional(),
	reference: z.string().trim().max(200).nullable().optional(),
	expectedAt: z.date().nullable().optional(),
	items: z
		.array(
			z.object({
				inventoryVariantId: z.number().int().positive(),
				qty: z.number().finite().positive().max(1_000_000),
				unitPrice: z.number().finite().nonnegative().nullable().optional(),
				location: z.string().trim().max(120).nullable().optional(),
			}),
		)
		.min(1)
		.max(100),
});
export async function createGeneralInbound(
	db: Db,
	input: z.infer<typeof generalInboundSchema>,
	actorId: number,
) {
	const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM Users WHERE id=${actorId} FOR UPDATE`;
			const prior = await tx.event.findFirst({
				where: {
					userId: actorId,
					type: "general_inbound_created",
					deletedAt: null,
					data: { path: "$.idempotencyKey", equals: input.idempotencyKey },
				},
				select: { data: true },
			});
			if (prior) {
				const data = prior.data as { hash: string; inboundId: number };
				if (data.hash !== hash)
					throw new StockAdjustmentError(
						"CONFLICT",
						"This inbound request was already used with different details.",
					);
				return { inboundId: data.inboundId, replayed: true };
			}
			if (
				input.supplierId &&
				!(await tx.supplier.findFirst({
					where: { id: input.supplierId, deletedAt: null },
					select: { id: true },
				}))
			)
				throw new StockAdjustmentError(
					"BAD_REQUEST",
					"The supplier is archived or unavailable.",
				);
			const ids = [
				...new Set(input.items.map((item) => item.inventoryVariantId)),
			];
			const variants = await tx.inventoryVariant.findMany({
				where: {
					id: { in: ids },
					deletedAt: null,
					inventory: {
						deletedAt: null,
						inventoryCategory: { deletedAt: null },
					},
				},
				select: { id: true },
			});
			if (variants.length !== ids.length)
				throw new StockAdjustmentError(
					"BAD_REQUEST",
					"An inbound variant is archived or unavailable.",
				);
			const inbound = await createInboundShipment(tx, {
				creatorUserId: actorId,
				supplierId: input.supplierId,
				reference: input.reference,
				expectedAt: input.expectedAt,
			});
			await tx.inboundShipmentItem.createMany({
				data: input.items.map((item) => ({
					inboundId: inbound.id,
					inventoryVariantId: item.inventoryVariantId,
					qty: item.qty,
					unitPrice: item.unitPrice,
					location: item.location || null,
				})),
			});
			await tx.event.create({
				data: {
					type: "general_inbound_created",
					userId: actorId,
					data: {
						idempotencyKey: input.idempotencyKey,
						hash,
						inboundId: inbound.id,
					},
				},
			});
			return { inboundId: inbound.id, replayed: false };
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}
