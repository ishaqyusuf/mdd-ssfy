/** Disposable local legacy-production fixture for real fulfillment row QA. */
const args = new Set(process.argv.slice(2));
const fixtureId = `QA-ROW-FULFILLMENT-20260914${args.has("--status") ? "-STATUS" : args.has("--mobile") ? "-MOBILE" : args.has("--timing") ? "-TIMING" : ""}`;
for (const arg of args) if (!["--apply", "--cleanup", "--mobile", "--timing", "--status"].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
const url = new URL(process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3307/gnd-prisma2");
if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "3307" || url.pathname !== "/gnd-prisma2") throw new Error("Local fixture requires gnd-prisma2 on port3307.");
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../packages/db/src/index.ts");
const { createSalesAssignmentAction, resetSalesAction } = await import("../../packages/sales/src/sales-control/actions.ts");
const { getSaleInformation } = await import("../../packages/sales/src/sales-control/get-sale-information.ts");
const { getSalesPipelineSnapshots } = await import("../../packages/sales/src/sales-pipeline-order.ts");
const { refreshSalesOrderListProjections } = await import("../../packages/sales/src/order-list-projection-builder.ts");
try {
  const existing = await db.salesOrders.findFirst({ where: { orderId: fixtureId, deletedAt: {} }, select: { id: true, meta: true, deletedAt: true } });
  if (existing && (existing.meta as { validationFixtureId?: string })?.validationFixtureId !== fixtureId) throw new Error("Fixture collision");
  console.log({ fixtureId, target: `${url.hostname}:${url.port}${url.pathname}`, apply: args.has("--apply"), cleanup: args.has("--cleanup"), existing });
  if (!args.has("--apply")) process.exitCode = 0;
  else if (args.has("--cleanup")) {
    if (existing) await db.$transaction(async tx => {
      const id = existing.id;
      const deletedAt = new Date();
      await tx.orderItemDelivery.updateMany({ where: { orderId: id }, data: { deletedAt } });
      await tx.orderDelivery.updateMany({ where: { salesOrderId: id }, data: { deletedAt } });
      await tx.orderProductionSubmissions.updateMany({ where: { salesOrderId: id }, data: { deletedAt } });
      await tx.orderItemProductionAssignments.updateMany({ where: { orderId: id }, data: { deletedAt } });
      await tx.qtyControl.updateMany({ where: { itemControl: { salesId: id } }, data: { deletedAt } });
      await tx.salesItemControl.updateMany({ where: { salesId: id }, data: { deletedAt } });
      await tx.salesStat.updateMany({ where: { salesId: id }, data: { deletedAt } });
      await tx.salesOrderItems.updateMany({ where: { salesOrderId: id }, data: { deletedAt } });
      await tx.salesOrderListProjection.updateMany({ where: { salesOrderId: id }, data: { salesDeletedAt: deletedAt } });
      await tx.salesOrders.updateMany({ where: { id, deletedAt: {} }, data: { deletedAt } });
    });
  } else {
    if (existing) throw new Error("Fixture already exists; inspect it rather than overwrite its workflow history.");
    const actor = await db.users.findFirstOrThrow({ where: { id: 1, deletedAt: null, accessRevokedAt: null }, select: { id: true } });
    const order = await db.$transaction(async tx => {
      const order = await tx.salesOrders.create({ data: {
        orderId: fixtureId, slug: fixtureId.toLowerCase(), title: "Synthetic completed-production fulfillment QA", type: "order", status: "Active", isDyke: false,
        subTotal: 0, grandTotal: 0, amountDue: 0, deliveryOption: "pickup",
        meta: { validationFixtureId: fixtureId },
        items: { create: { description: "Synthetic legacy production item", swing: "LH", qty: 1, price: 0, total: 0, meta: { validationFixtureId: fixtureId } } },
      }, select: { id: true } });
      await resetSalesAction(tx as typeof db, order.id);
      const info = await getSaleInformation(tx as typeof db, { salesId: order.id });
      if (!args.has("--status")) await createSalesAssignmentAction(tx as typeof db, {
        salesId: order.id, authorId: actor.id, assignedToId: actor.id, submit: true, updateStats: true,
        submissionMeta: { validationFixtureId: fixtureId, source: "synthetic_legacy_production_fixture" },
        items: info.items.map(item => ({ itemInfo: item, qty: item.analytics!.assignment.pending })),
      });
      await resetSalesAction(tx as typeof db, order.id);
      return order;
    });
    const snapshot = (await getSalesPipelineSnapshots(db, [order.id])).get(order.id)!;
    await refreshSalesOrderListProjections(db, [{ salesOrderId: order.id, sourceUpdatedAt: new Date(snapshot.freshness.evidenceUpdatedAt!) }]);
    console.log({ created: order.id, headline: snapshot.headline.code, production: snapshot.production.state, fulfillment: snapshot.fulfillment.state, allowed: snapshot.capabilities.markFulfilled.allowed });
  }
} finally { await db.$disconnect(); }
