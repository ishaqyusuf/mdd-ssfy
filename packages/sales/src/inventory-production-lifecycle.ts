import type { Db } from "./types";
import { syncSalesInventoryLineItems } from "./sync-sales-inventory-line-items";

export type ProductionProjection = {
  orderedQty: number;
  assignedQty: number;
  fulfilledQty: number;
  remainingQty: number;
  status:
    | "pending"
    | "assigned"
    | "partially_fulfilled"
    | "fulfilled";
  updatedAt: string;
};

type ProductionLineSource = {
  uid?: string | null;
  salesItemId?: number | null;
  qty?: number | null;
};

type ProductionAssignmentSource = {
  itemId?: number | null;
  salesItemControlUid?: string | null;
  qtyAssigned?: number | null;
  lhQty?: number | null;
  rhQty?: number | null;
  submissions?: Array<{
    qty?: number | null;
    lhQty?: number | null;
    rhQty?: number | null;
  }> | null;
};

function qtyValue(input: {
  qty?: number | null;
  qtyAssigned?: number | null;
  lhQty?: number | null;
  rhQty?: number | null;
}) {
  const qty = Number(input.qty ?? input.qtyAssigned ?? 0);
  const handledQty = Number(input.lhQty || 0) + Number(input.rhQty || 0);
  return qty || handledQty;
}

function resolveProductionStatus(input: {
  orderedQty: number;
  assignedQty: number;
  fulfilledQty: number;
}): ProductionProjection["status"] {
  if (input.orderedQty > 0 && input.fulfilledQty >= input.orderedQty) {
    return "fulfilled";
  }
  if (input.fulfilledQty > 0) return "partially_fulfilled";
  if (input.assignedQty > 0) return "assigned";
  return "pending";
}

export function mergeMetaWithProduction(
  meta: unknown,
  production: ProductionProjection,
) {
  const current =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as Record<string, unknown>)
      : {};
  const currentProduction =
    current.production &&
    typeof current.production === "object" &&
    !Array.isArray(current.production)
      ? (current.production as Record<string, unknown>)
      : {};

  return {
    ...current,
    production: {
      ...currentProduction,
      ...production,
    },
  };
}

export function buildInventoryProductionProjection(
  lineItem: ProductionLineSource,
  assignments: ProductionAssignmentSource[],
  now = new Date(),
): ProductionProjection {
  const matchingAssignments = assignments.filter((assignment) => {
    if (lineItem.salesItemId && assignment.itemId === lineItem.salesItemId) {
      return true;
    }
    return Boolean(
      lineItem.uid && assignment.salesItemControlUid === lineItem.uid,
    );
  });
  const assignedQty = matchingAssignments.reduce(
    (total, assignment) => total + qtyValue(assignment),
    0,
  );
  const fulfilledQty = matchingAssignments.reduce(
    (total, assignment) =>
      total +
      (assignment.submissions || []).reduce(
        (submissionTotal, submission) =>
          submissionTotal + qtyValue(submission),
        0,
      ),
    0,
  );
  const orderedQty = Number(lineItem.qty || 0);

  return {
    orderedQty,
    assignedQty,
    fulfilledQty,
    remainingQty: Math.max(orderedQty - fulfilledQty, 0),
    status: resolveProductionStatus({
      orderedQty,
      assignedQty,
      fulfilledQty,
    }),
    updatedAt: now.toISOString(),
  };
}

export async function syncInventoryProductionLifecycleForSale(
  db: Db,
  salesId: number,
) {
  await syncSalesInventoryLineItems(db as any, {
    salesOrderId: salesId,
    source: "repair",
  });

  const [lineItems, assignments] = await Promise.all([
    db.lineItem.findMany({
      where: {
        saleId: salesId,
        deletedAt: null,
      },
      select: {
        id: true,
        uid: true,
        salesItemId: true,
        qty: true,
        meta: true,
      },
    }),
    db.orderItemProductionAssignments.findMany({
      where: {
        orderId: salesId,
        deletedAt: null,
      },
      select: {
        itemId: true,
        salesItemControlUid: true,
        qtyAssigned: true,
        lhQty: true,
        rhQty: true,
        submissions: {
          where: {
            deletedAt: null,
          },
          select: {
            qty: true,
            lhQty: true,
            rhQty: true,
          },
        },
      },
    }),
  ]);

  const now = new Date();
  let updated = 0;
  for (const lineItem of lineItems) {
    const production = buildInventoryProductionProjection(
      lineItem,
      assignments,
      now,
    );

    await db.lineItem.update({
      where: {
        id: lineItem.id,
      },
      data: {
        meta: mergeMetaWithProduction(lineItem.meta, production),
      },
    });
    updated += 1;
  }

  return {
    lineItems: lineItems.length,
    updated,
  };
}
