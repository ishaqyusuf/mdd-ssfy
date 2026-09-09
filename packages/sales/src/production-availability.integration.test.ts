import { expect, test } from "bun:test";
import { db, Prisma, type Db } from "@gnd/db";
import {
	getProductionAvailability,
	markProductionMaterialsAvailable,
} from "./production-availability";
import { getInboundShipmentDetail } from "@gnd/inventory/inbound";

const localTest =
	process.env.GND_AVAILABILITY_DB_TEST === "1" ? test : test.skip;
const rollback = new Error("ROLLBACK_AVAILABILITY_FIXTURE");
localTest(
	"partial availability keeps the remainder, full availability clears it, and replay does not receive twice",
	async () => {
		const target = new URL(process.env.DATABASE_URL || "mysql://missing");
		if (!["localhost", "127.0.0.1", "::1"].includes(target.hostname))
			throw new Error("Availability fixtures require a local database.");
		try {
			await db.$transaction(
				async (tx) => {
					const uid = `availability-${crypto.randomUUID()}`;
					const user = await tx.users.findFirstOrThrow({
						select: { id: true },
					});
					const actor = {
						id: user.id,
						canViewAll: true,
						canEditInbound: true,
						canMarkAvailable: true,
					};
					const category = await tx.inventoryCategory.create({
						data: {
							uid,
							title: uid,
							stockMode: "monitored",
							productKind: "single",
						},
					});
					const inventory = await tx.inventory.create({
						data: {
							uid,
							name: uid,
							inventoryCategoryId: category.id,
							stockMode: "monitored",
							productKind: "single",
						},
					});
					const variant = await tx.inventoryVariant.create({
						data: { uid, inventoryId: inventory.id },
					});
					const sub = await tx.subComponents.create({
						data: { inventoryCategoryId: category.id, parentId: inventory.id },
					});
					const sale = await tx.salesOrders.create({
						data: {
							orderId: uid,
							slug: uid,
							type: "order",
							isDyke: true,
							status: "Draft",
						},
					});
					const salesItem = await tx.salesOrderItems.create({
						data: { salesOrderId: sale.id, qty: 10, dykeProduction: true },
					});
					const line = await tx.lineItem.create({
						data: {
							lineItemType: "SALE",
							saleId: sale.id,
							salesItemId: salesItem.id,
							qty: 10,
							inventoryId: inventory.id,
							inventoryVariantId: variant.id,
							inventoryCategoryId: category.id,
						},
					});
					const [sequence] = await tx.$queryRaw<Array<{ nextId: bigint }>>(
						Prisma.sql`SELECT GREATEST(COALESCE((SELECT MAX(id) FROM LineItemComponents),0),COALESCE((SELECT MAX(lineItemComponentId) FROM StockAllocation),0),COALESCE((SELECT MAX(lineItemComponentId) FROM InboundDemand),0))+1 AS nextId`,
					);
					await tx.lineItemComponents.create({
						data: {
							id: Number(sequence!.nextId),
							lineItemId: line.id,
							subComponentId: sub.id,
							inventoryId: inventory.id,
							inventoryVariantId: variant.id,
							inventoryCategoryId: category.id,
							qty: 10,
							required: true,
							status: "inbound_required",
						},
					});
					const client = new Proxy(tx, {
						get(target, key) {
							return key === "$transaction"
								? async (fn: (value: typeof tx) => unknown) => fn(tx)
								: Reflect.get(target, key);
						},
					}) as unknown as Db;
					const before = await getProductionAvailability(tx, sale.id, actor);
					expect(before).toMatchObject({
						state: "missing_inbound",
						pendingQty: 10,
						markableQty: 10,
					});
					const input = {
						salesOrderId: sale.id,
						expectedRevision: before.revision,
						idempotencyKey: crypto.randomUUID(),
						supplierId: null,
						receivedDate: "2026-09-08",
						selection: {
							mode: "selected" as const,
							items: [{ id: before.needs[0]!.id, qty: 4 }],
						},
					};
					const saved = await markProductionMaterialsAvailable(
						client,
						input,
						async () => actor,
					);
					expect(saved).toMatchObject({
						receivedQty: 4,
						remainingQty: 6,
						replayed: false,
					});
					const partial = await getProductionAvailability(tx, sale.id, actor);
					expect(partial).toMatchObject({
						state: "remaining_needs",
						pendingQty: 6,
						inboundCount: 1,
						markableQty: 6,
					});
					expect(
						await markProductionMaterialsAvailable(
							client,
							input,
							async () => actor,
						),
					).toMatchObject({ receivedQty: 4, replayed: true });
					const detail = await getInboundShipmentDetail(tx, {
						inboundId: saved.inboundId,
					});
					expect(detail?.receivedAt?.toISOString()).toBe(
						"2026-09-08T16:00:00.000Z",
					);
					await expect(
						markProductionMaterialsAvailable(
							client,
							{ ...input, supplierId: 1 },
							async () => actor,
						),
					).rejects.toThrow("different details");
					const second = await markProductionMaterialsAvailable(
						client,
						{
							...input,
							expectedRevision: partial.revision,
							idempotencyKey: crypto.randomUUID(),
							selection: {
								mode: "selected",
								items: [{ id: partial.needs[0]!.id, qty: 2 }],
							},
						},
						async () => actor,
					);
					expect(second).toMatchObject({ receivedQty: 2, remainingQty: 4 });
					const next = await getProductionAvailability(tx, sale.id, actor);
					const all = await markProductionMaterialsAvailable(
						client,
						{
							...input,
							expectedRevision: next.revision,
							idempotencyKey: crypto.randomUUID(),
							selection: { mode: "all" },
						},
						async () => actor,
					);
					expect(all).toMatchObject({ receivedQty: 4, remainingQty: 0 });
					expect(
						await getProductionAvailability(tx, sale.id, actor),
					).toMatchObject({
						state: "covered",
						pendingQty: 0,
						markableQty: 0,
						inboundCount: 3,
					});
					throw rollback;
				},
				{ timeout: 60000, isolationLevel: "Serializable" },
			);
		} catch (error) {
			if (error !== rollback) throw error;
		}
	},
	70000,
);
