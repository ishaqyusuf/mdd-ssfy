import { expect, test } from "bun:test";
import { db, type Db } from "@gnd/db";
import { buildSalesDispatchBacklogWhere } from "./dispatch-backlog";
import { getFulfillmentBacklogOrderIds } from "./fulfillment-backlog-query";
import { getSalesDispatchOverview } from "./sales-control/get-dispatch-information";
import { itemItemControlUid } from "./utils/sales-control";
const localTest = process.env.GND_FULFILLMENT_DB_TEST === "1" ? test : test.skip;
localTest("persisted plan, physical packing and confirmed shortage agree across overview and backlog", async () => {
 const target = new URL(process.env.DATABASE_URL || "mysql://missing");
 if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)) throw new Error("Fulfillment fixtures require a local database");
 const rollback = new Error("ROLLBACK_FULFILLMENT_FIXTURE");
 let verified = false;
 try {
  await db.$transaction(async (tx) => {
   const uid = `fulfillment-test-${crypto.randomUUID()}`;
   const sale = await tx.salesOrders.create({ data: { orderId: uid, slug: uid, type: "order", isDyke: false, status: "Draft", deliveryOption: "delivery" } });
   const item = await tx.salesOrderItems.create({ data: { salesOrderId: sale.id, qty: 10, description: "Fulfillment fixture" } });
   const controlUid = itemItemControlUid(item.id);
   await tx.salesItemControl.create({ data: { uid: controlUid, salesId: sale.id, orderItemId: item.id, shippable: true, produceable: false,
    qtyControls: { create: { type: "qty", qty: 10, lh: 0, rh: 0, total: 10, itemTotal: 10 } } } });
   const candidate = { AND: [buildSalesDispatchBacklogWhere(), { id: sale.id }] };
   const overview = () => getSalesDispatchOverview(tx as unknown as Db, { salesId: sale.id, salesNo: undefined });
   expect(await getFulfillmentBacklogOrderIds(tx, candidate)).toEqual([sale.id]);
   expect((await overview()).fulfillmentQuantities).toMatchObject({ resolved: true, backlogQty: 10 });
   const plan = (qty: number, revision: number) => ({ fulfillmentAssignment: { version: 1, revision, selectionMode: "selected", lines: [{ uid: controlUid, quantity: { qty, lh: 0, rh: 0 } }] } });
   const delivery = await tx.orderDelivery.create({ data: { salesOrderId: sale.id, deliveryMode: "delivery", status: "queue", meta: plan(5, 1) } });
   expect((await overview()).fulfillmentQuantities.backlogQty).toBe(5);
   expect(await getFulfillmentBacklogOrderIds(tx, candidate)).toEqual([sale.id]);
   await tx.orderItemDelivery.create({ data: { orderId: sale.id, orderItemId: item.id, orderDeliveryId: delivery.id, qty: 3, packingStatus: "packed" } });
   expect((await overview()).fulfillmentQuantities.backlogQty).toBe(5);
   await tx.orderDelivery.update({ where: { id: delivery.id }, data: { meta: plan(3, 2) } });
   expect((await overview()).fulfillmentQuantities.backlogQty).toBe(7);
   await tx.orderDelivery.update({ where: { id: delivery.id }, data: { status: "completed", meta: { ...plan(3, 2), dispatchCompletion: { status: "completed" } } } });
   const completed = (await overview()).fulfillmentQuantities;
   expect(completed.lines[0]?.delivered.qty).toBe(3);
   expect(completed.backlogQty).toBe(7);
   expect(await getFulfillmentBacklogOrderIds(tx, candidate)).toEqual([sale.id]);
   await tx.orderDelivery.create({ data: { salesOrderId: sale.id, deliveryMode: "delivery", status: "queue" } });
   expect((await overview()).fulfillmentQuantities.resolved).toBe(false);
   expect(await getFulfillmentBacklogOrderIds(tx, candidate)).toEqual([]);
   verified = true;
   throw rollback;
  }, { timeout: 30000 });
 } catch (error) { if (error !== rollback) throw error; }
 expect(verified).toBe(true);
}, 40000);
