import type { Db, TransactionClient } from "@gnd/db";
import { readFulfillmentAssignmentScope } from "./fulfillment-assignment-scope";
import { fulfillmentBacklogEvidenceSelect, projectBacklogEvidence } from "./fulfillment-backlog-query";
import { validateFulfillmentPackingScope } from "./fulfillment-packing-scope";

export class FulfillmentEmptyLoadError extends Error {
  constructor() { super("Pack approved quantities before completing this fulfillment."); }
}

/** Caller holds the fulfillment lock. This proves a nonempty load, not full scope readiness. */
export async function assertFulfillmentHasPackedItems(
  tx: Db | TransactionClient,
  input: { salesId: number; fulfillmentId: number },
) {
  const packedRows = await tx.orderItemDelivery.count({
    where: {
      orderId: input.salesId,
      orderDeliveryId: input.fulfillmentId,
      deletedAt: null,
      packingStatus: "packed",
      OR: [{ qty: { gt: 0 } }, { lhQty: { gt: 0 } }, { rhQty: { gt: 0 } }],
    },
  });
  if (!packedRows) throw new FulfillmentEmptyLoadError();
}

/** Caller owns lifecycle authorization and the order/fulfillment transaction locks. */
export async function assertFulfillmentScopePacked(tx: TransactionClient, input: {
  salesId: number;
  fulfillmentId: number;
  meta: unknown;
}) {
  const parsed = readFulfillmentAssignmentScope(input.meta);
  if (parsed.state === "legacy") return;
  if (!parsed.scope) throw new Error("Review fulfillment quantities before continuing.");
  const evidence = await tx.salesOrders.findUniqueOrThrow({ where: { id: input.salesId }, select: fulfillmentBacklogEvidenceSelect });
  const delivery = evidence.deliveries.find(row => row.id === input.fulfillmentId);
  if (!delivery) throw new Error("Fulfillment was not found for this order.");
  const physical = projectBacklogEvidence({ ...evidence, deliveries: [delivery] }).projection;
  if (!physical.resolved) throw new Error("Review physical packing before continuing.");
  const lines = validateFulfillmentPackingScope({
    meta: delivery.meta,
    expectedScopeRevision: parsed.scope.revision,
    lines: physical.lines.filter(line => line.packed.qty + line.packed.lh + line.packed.rh > 0).map(line => ({ uid: line.uid, quantity: line.packed })),
  });
  if (!lines.length || lines.some(line => line.leftBehind.qty + line.leftBehind.lh + line.leftBehind.rh > 0))
    throw new Error("Pack assigned quantities or confirm the short load before continuing.");
}
