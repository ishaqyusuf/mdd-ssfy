import { expect, test } from "bun:test";
import { db } from "@gnd/db";
import { itemItemControlUid } from "../utils/sales-control";
import { ensureSalesOrderFulfillmentDispatchInTransaction } from "./ensure-fulfillment-dispatch";

const localTest =
	process.env.GND_FULFILLMENT_DB_TEST === "1" ? test : test.skip;

localTest(
	"bulk fulfillment persists exact scope and one audit across reuse and follow-up",
	async () => {
		const target = new URL(process.env.DATABASE_URL || "mysql://missing");
		if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)) {
			throw new Error("Fulfillment fixtures require a local database");
		}
		const rollback = new Error("ROLLBACK_BULK_FULFILLMENT_FIXTURE");
		let verified = false;
		try {
			await db.$transaction(
				async (tx) => {
					const token = crypto.randomUUID();
					const actor = await tx.users.create({
						data: { email: `${token}@fixture.invalid`, name: "Fixture admin" },
					});
					const dueDate = new Date("2026-09-11T00:00:00Z");
					const order = await tx.salesOrders.create({
						data: {
							orderId: token,
							slug: token,
							type: "order",
							status: "Draft",
							isDyke: false,
							deliveryOption: "delivery",
							deliveryDueDate: dueDate,
						},
					});
					const item = await tx.salesOrderItems.create({
						data: {
							salesOrderId: order.id,
							qty: 5,
							description: "Bulk fixture",
						},
					});
					const uid = itemItemControlUid(item.id);
					await tx.salesItemControl.create({
						data: {
							uid,
							salesId: order.id,
							orderItemId: item.id,
							shippable: true,
							produceable: false,
							qtyControls: {
								create: {
									type: "qty",
									qty: 5,
									lh: 0,
									rh: 0,
									total: 5,
									itemTotal: 5,
								},
							},
						},
					});
					const input = { salesId: order.id, createdById: actor.id };
					const first = await ensureSalesOrderFulfillmentDispatchInTransaction(
						tx,
						input,
					);
					expect(first).toMatchObject({ state: "ready", created: true });
					const saved = await tx.orderDelivery.findUniqueOrThrow({
						where: { id: first.dispatchId! },
					});
					expect(saved.dueDate).toEqual(dueDate);
					expect(saved.meta).toMatchObject({
						fulfillmentAssignment: {
							selectionMode: "all_remaining",
							lines: [{ uid, quantity: { qty: 5, lh: 0, rh: 0 } }],
						},
					});
					expect(
						await ensureSalesOrderFulfillmentDispatchInTransaction(tx, input),
					).toMatchObject({ dispatchId: first.dispatchId, created: false });
					expect(
						await tx.salesHistory.count({ where: { salesId: order.id } }),
					).toBe(1);
					// Persist a completed three-unit load, leaving two units for a follow-up.
					await tx.orderDelivery.update({
						where: { id: first.dispatchId! },
						data: {
							status: "completed",
							deliveredAt: new Date(),
							meta: {
								dispatchCompletion: { status: "completed" },
								fulfillmentAssignment: {
									version: 1,
									revision: 2,
									selectionMode: "selected",
									lines: [{ uid, quantity: { qty: 3, lh: 0, rh: 0 } }],
								},
							},
						},
					});
					await tx.orderItemDelivery.create({
						data: {
							orderId: order.id,
							orderDeliveryId: first.dispatchId!,
							orderItemId: item.id,
							packingStatus: "packed",
							qty: 3,
							lhQty: 0,
							rhQty: 0,
						},
					});
					await tx.salesOrders.update({
						where: { id: order.id },
						data: { deliveredAt: new Date() },
					});
					const next = await ensureSalesOrderFulfillmentDispatchInTransaction(
						tx,
						input,
					);
					expect(next).toMatchObject({ state: "ready", created: true });
					expect(next.dispatchId).not.toBe(first.dispatchId);
					expect(
						(
							await tx.orderDelivery.findUniqueOrThrow({
								where: { id: next.dispatchId! },
							})
						).meta,
					).toMatchObject({
						fulfillmentAssignment: {
							lines: [{ uid, quantity: { qty: 2, lh: 0, rh: 0 } }],
						},
					});
					expect(
						await ensureSalesOrderFulfillmentDispatchInTransaction(tx, input),
					).toMatchObject({ dispatchId: next.dispatchId, created: false });
					const audits = await tx.salesHistory.findMany({
						where: { salesId: order.id },
						orderBy: { createdAt: "asc" },
					});
					expect(audits).toHaveLength(2);
					expect(audits.map((row) => row.data)).toEqual(
						expect.arrayContaining([
							expect.objectContaining({
								event: "FULFILLMENT_ASSIGNED",
								dispatchId: first.dispatchId,
								actorId: actor.id,
								plannedQty: 5,
							}),
							expect.objectContaining({
								event: "FULFILLMENT_ASSIGNED",
								dispatchId: next.dispatchId,
								actorId: actor.id,
								plannedQty: 2,
							}),
						]),
					);
					expect(
						(
							await tx.orderDelivery.findUniqueOrThrow({
								where: { id: first.dispatchId! },
							})
						).status,
					).toBe("completed");
					expect(next.dispatchIds).toEqual([next.dispatchId!]);
					await tx.salesOrderItems.update({
						where: { id: item.id },
						data: { qty: 8 },
					});
					await tx.salesItemControl.update({
						where: { uid },
						data: {
							qtyControls: {
								updateMany: {
									where: { type: "qty" },
									data: { qty: 8, total: 8, itemTotal: 8 },
								},
							},
						},
					});
					const additional =
						await ensureSalesOrderFulfillmentDispatchInTransaction(tx, input);
					expect(additional.dispatchIds).toEqual([
						next.dispatchId!,
						additional.dispatchId!,
					]);
					expect(
						(
							await tx.orderDelivery.findUniqueOrThrow({
								where: { id: additional.dispatchId! },
							})
						).meta,
					).toMatchObject({
						fulfillmentAssignment: {
							lines: [{ uid, quantity: { qty: 3, lh: 0, rh: 0 } }],
						},
					});
					verified = true;
					throw rollback;
				},
				{ timeout: 30000, isolationLevel: "Serializable" },
			);
		} catch (error) {
			if (error !== rollback) throw error;
		}
		expect(verified).toBe(true);
	},
);
