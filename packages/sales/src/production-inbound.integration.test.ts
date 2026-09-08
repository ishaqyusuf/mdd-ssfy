import { expect, test } from "bun:test";
import { db, type Db } from "@gnd/db";
import {
	getProductionPendingInbounds,
	receiveProductionInbound,
} from "./production-inbound";

// Opt-in local MySQL test. Every fixture and receipt is inside a transaction
// which is deliberately rolled back; no existing business row is edited.
const localTest = process.env.GND_RECEIPT_DB_TEST === "1" ? test : test.skip;
const rollback = new Error("ROLLBACK_PRODUCTION_RECEIPT_FIXTURE");

for (const scenario of [
	"single",
	"split-demand",
	"partial",
	"invalid-pending",
	"shared-shipment",
] as const) {
	localTest(
		`local receipt transaction: ${scenario}`,
		async () => {
			const target = new URL(process.env.DATABASE_URL || "mysql://missing");
			if (!["127.0.0.1", "localhost", "::1"].includes(target.hostname))
				throw new Error("Receipt fixtures require a local database");
			let orderId = 0;
			try {
				await db.$transaction(
					async (tx) => {
						const unique = `receipt-test-${crypto.randomUUID()}`;
						const user = await tx.users.findFirstOrThrow({
							select: { id: true },
						});
						const actor = {
							id: user.id,
							canEditInbound: true,
							canViewAll: true,
						};
						const category = await tx.inventoryCategory.create({
							data: { title: unique, uid: unique },
						});
						const inventory = await tx.inventory.create({
							data: {
								name: unique,
								uid: unique,
								inventoryCategoryId: category.id,
							},
						});
						const variant = await tx.inventoryVariant.create({
							data: { uid: unique, inventoryId: inventory.id },
						});
						const sub = await tx.subComponents.create({
							data: {
								inventoryCategoryId: category.id,
								parentId: inventory.id,
							},
						});
						const sale = await tx.salesOrders.create({
							data: {
								orderId: unique,
								slug: unique,
								type: "order",
								status: "Draft",
							},
						});
						orderId = sale.id;
						const line = await tx.lineItem.create({
							data: {
								lineItemType: "SALE",
								inventoryId: inventory.id,
								inventoryCategoryId: category.id,
								inventoryVariantId: variant.id,
								saleId: sale.id,
								qty: 10,
							},
						});
						const component = await tx.lineItemComponents.create({
							data: {
								lineItemId: line.id,
								subComponentId: sub.id,
								inventoryId: inventory.id,
								inventoryVariantId: variant.id,
								qty: 10,
								required: true,
							},
						});
						const inbound = await tx.inboundShipment.create({
							data: { status: "pending", reference: unique },
						});
						const delivered = scenario === "partial" ? 5 : 10;
						if (scenario === "shared-shipment")
							await tx.inboundShipmentItem.createMany({
								data: Array.from({ length: 52 }, () => ({
									inboundId: inbound.id,
									inventoryVariantId: variant.id,
									qty: 1,
									qtyGood: 0,
									qtyIssue: 0,
								})),
							});
						const item = await tx.inboundShipmentItem.create({
							data: {
								inboundId: inbound.id,
								inventoryVariantId: variant.id,
								qty: delivered,
								qtyGood: 0,
								qtyIssue: 0,
							},
						});
						const quantities =
							scenario === "split-demand" ? [5, 5] : [delivered];
						for (const qty of quantities)
							await tx.inboundDemand.create({
								data: {
									lineItemComponentId: component.id,
									inventoryVariantId: variant.id,
									inboundShipmentItemId: item.id,
									qty,
									status: "pending",
								},
							});
						if (scenario === "invalid-pending")
							await tx.stockAllocation.create({
								data: {
									lineItemComponentId: component.id,
									inventoryVariantId: variant.id,
									qty: 20,
									status: "pending_review",
								},
							});
						const client = new Proxy(tx, {
							get(target, property) {
								if (property === "$transaction")
									return async (
										fn: (value: typeof tx) => unknown,
										options: { isolationLevel: string },
									) => {
										expect(options.isolationLevel).toBe("Serializable");
										return fn(tx);
									};
								return Reflect.get(target, property);
							},
						}) as unknown as Db;
						const preview = await getProductionPendingInbounds(
							client,
							{ salesOrderId: sale.id, take: 10 },
							actor,
						);
						expect(preview.count).toBe(1);
						expect(preview.rows[0]?.canReceive).toBe(true);
						const input = {
							salesOrderId: sale.id,
							inboundId: inbound.id,
							expectedRevision: preview.rows[0]!.revision,
							idempotencyKey: crypto.randomUUID(),
						};
						if (scenario === "invalid-pending") {
							await expect(
								receiveProductionInbound(client, input, async () => actor),
							).rejects.toThrow("exceed material needs");
							throw rollback;
						}
						const result = await receiveProductionInbound(
							client,
							input,
							async () => actor,
						);
						expect(result.remainingBackorderQty).toBe(
							scenario === "partial" ? 5 : 0,
						);
						const replay = await receiveProductionInbound(
							client,
							input,
							async () => actor,
						);
						expect(replay.replayed).toBe(true);
						expect(
							await tx.stockMovement.count({
								where: { inboundStockItemId: item.id },
							}),
						).toBe(1);
						expect(
							(
								await tx.inventoryStock.aggregate({
									where: { inventoryVariantId: variant.id },
									_sum: { qty: true },
								})
							)._sum.qty,
						).toBe(delivered);
						expect(
							(
								await tx.stockAllocation.aggregate({
									where: { lineItemComponentId: component.id },
									_sum: { qty: true },
								})
							)._sum.qty,
						).toBe(delivered);
						expect(
							(
								await tx.inboundDemand.aggregate({
									where: { lineItemComponentId: component.id },
									_sum: { qtyReceived: true },
								})
							)._sum.qtyReceived,
						).toBe(delivered);
						expect(
							await tx.orderProductionSubmissions.count({
								where: { assignment: { orderId: sale.id } },
							}),
						).toBe(0);
						expect(
							(
								await getProductionPendingInbounds(
									client,
									{ salesOrderId: sale.id, take: 10 },
									actor,
								)
							).count,
						).toBe(0);
						throw rollback;
					},
					{ isolationLevel: "Serializable", timeout: 30000 },
				);
			} catch (error) {
				if (error !== rollback) throw error;
			}
			expect(orderId).toBeGreaterThan(0);
			expect(await db.salesOrders.count({ where: { id: orderId } })).toBe(0);
		},
		40000,
	);
}
