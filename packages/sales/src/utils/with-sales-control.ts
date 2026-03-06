import type { Db } from "@gnd/db";
import type { SalesDispatchStatus, SalesStatStatus } from "../types";

export type QtyStat = { total: number; lhQty: number; rhQty: number };

export type SalesControlStatistic = {
  qty: QtyStat;
  prodAssigned: QtyStat;
  prodCompleted: QtyStat;
  dispatchAssigned: QtyStat;
  dispatchInProgress: QtyStat;
  dispatchCompleted: QtyStat;
  dispatchCancelled: QtyStat;
  pendingAssignment: QtyStat;
  pendingSubmission: QtyStat;
  packables: QtyStat;
  pendingPacking: QtyStat;
  pendingDispatch: QtyStat;
  packed: QtyStat;
  productionStatus: SalesStatStatus;
  dispatchStatus: SalesDispatchStatus | "unknown";
};

export type WithStatistic<T> = T & { statistic: SalesControlStatistic };

type QtyControlType =
  | "qty"
  | "prodAssigned"
  | "prodCompleted"
  | "dispatchAssigned"
  | "dispatchInProgress"
  | "dispatchCompleted"
  | "dispatchCancelled";

type OrderControlAggregate = Record<QtyControlType, QtyStat>;

const QTY_CONTROL_TYPES: QtyControlType[] = [
  "qty",
  "prodAssigned",
  "prodCompleted",
  "dispatchAssigned",
  "dispatchInProgress",
  "dispatchCompleted",
  "dispatchCancelled",
];

const DISPATCH_STATUSES: SalesDispatchStatus[] = [
  "queue",
  "in progress",
  "completed",
  "cancelled",
];

function isDispatchStatus(
  value: string | null | undefined,
): value is SalesDispatchStatus {
  return !!value && DISPATCH_STATUSES.includes(value as SalesDispatchStatus);
}

function toNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function emptyQtyStat(): QtyStat {
  return {
    total: 0,
    lhQty: 0,
    rhQty: 0,
  };
}

function sumQtyStat(...stats: (QtyStat | null | undefined)[]): QtyStat {
  return stats.filter(Boolean).reduce(
    (acc, stat) => ({
      total: acc.total + toNumber(stat?.total),
      lhQty: acc.lhQty + toNumber(stat?.lhQty),
      rhQty: acc.rhQty + toNumber(stat?.rhQty),
    }),
    emptyQtyStat(),
  );
}

function diffQtyStat(base: QtyStat, subtract: QtyStat): QtyStat {
  return {
    total: Math.max(toNumber(base.total) - toNumber(subtract.total), 0),
    lhQty: Math.max(toNumber(base.lhQty) - toNumber(subtract.lhQty), 0),
    rhQty: Math.max(toNumber(base.rhQty) - toNumber(subtract.rhQty), 0),
  };
}

function emptyOrderAggregate(): OrderControlAggregate {
  return {
    qty: emptyQtyStat(),
    prodAssigned: emptyQtyStat(),
    prodCompleted: emptyQtyStat(),
    dispatchAssigned: emptyQtyStat(),
    dispatchInProgress: emptyQtyStat(),
    dispatchCompleted: emptyQtyStat(),
    dispatchCancelled: emptyQtyStat(),
  };
}

function deriveProductionStatus(
  totalAssignment: number,
  completedSubmission: number,
): SalesStatStatus {
  if (totalAssignment <= 0) return "unknown";
  if (completedSubmission <= 0) return "pending";
  if (completedSubmission >= totalAssignment) return "completed";
  return "in progress";
}

function deriveDispatchStatusFromControls(
  controls: Pick<
    OrderControlAggregate,
    | "dispatchAssigned"
    | "dispatchInProgress"
    | "dispatchCompleted"
    | "dispatchCancelled"
  >,
): SalesDispatchStatus | "unknown" {
  const queued = toNumber(controls.dispatchAssigned.total);
  const inProgress = toNumber(controls.dispatchInProgress.total);
  const completed = toNumber(controls.dispatchCompleted.total);
  const cancelled = toNumber(controls.dispatchCancelled.total);
  const nonCancelledTarget = queued + inProgress + completed;

  if (nonCancelledTarget > 0 && completed >= nonCancelledTarget)
    return "completed";
  if (inProgress > 0) return "in progress";
  if (queued > 0) return "queue";
  if (cancelled > 0) return "cancelled";
  return "unknown";
}

function toStatistic(
  aggregate: OrderControlAggregate,
  packed: QtyStat,
  dispatchStatus: SalesDispatchStatus | "unknown",
): SalesControlStatistic {
  const qty = aggregate.qty;
  const prodAssigned = aggregate.prodAssigned;
  const prodCompleted = aggregate.prodCompleted;
  const dispatchAssigned = aggregate.dispatchAssigned;
  const dispatchInProgress = aggregate.dispatchInProgress;
  const dispatchCompleted = aggregate.dispatchCompleted;
  const dispatchCancelled = aggregate.dispatchCancelled;

  const pendingAssignment = diffQtyStat(qty, prodAssigned);
  const pendingSubmission = diffQtyStat(prodAssigned, prodCompleted);
  const dispatchListed = sumQtyStat(
    dispatchAssigned,
    dispatchInProgress,
    dispatchCompleted,
  );
  const pendingDispatch = diffQtyStat(qty, dispatchListed);
  const packables = diffQtyStat(prodCompleted, packed);
  const pendingPacking = diffQtyStat(qty, packed);

  return {
    qty,
    prodAssigned,
    prodCompleted,
    dispatchAssigned,
    dispatchInProgress,
    dispatchCompleted,
    dispatchCancelled,
    pendingAssignment,
    pendingSubmission,
    packables,
    pendingPacking,
    pendingDispatch,
    packed,
    productionStatus: deriveProductionStatus(qty.total, prodCompleted.total),
    dispatchStatus,
  };
}

function buildOrderControlMap(
  itemControls: { uid: string; salesId: number }[],
  qtyControls: {
    itemControlUid: string;
    type: string;
    total: number | null;
    lh: number | null;
    rh: number | null;
  }[],
): Map<number, OrderControlAggregate> {
  const uidToOrderId = new Map<string, number>();
  for (const control of itemControls) {
    uidToOrderId.set(control.uid, control.salesId);
  }

  const orderMap = new Map<number, OrderControlAggregate>();
  for (const control of qtyControls) {
    const orderId = uidToOrderId.get(control.itemControlUid);
    if (!orderId) continue;

    const type = control.type as QtyControlType;
    if (!QTY_CONTROL_TYPES.includes(type)) continue;

    const current = orderMap.get(orderId) ?? emptyOrderAggregate();
    current[type] = sumQtyStat(current[type], {
      total: toNumber(control.total),
      lhQty: toNumber(control.lh),
      rhQty: toNumber(control.rh),
    });
    orderMap.set(orderId, current);
  }

  return orderMap;
}

function buildOrderPackedMap(
  deliveries: { id: number; salesOrderId: number; status: string | null }[],
  deliveryItems: {
    orderId: number;
    orderDeliveryId: number | null;
    qty: number;
    lhQty: number | null;
    rhQty: number | null;
    packingStatus: string | null;
  }[],
): Map<number, QtyStat> {
  const deliveryStatusById = new Map<number, string | null>();
  for (const d of deliveries) {
    deliveryStatusById.set(d.id, d.status);
  }

  const packedMap = new Map<number, QtyStat>();
  for (const item of deliveryItems) {
    const orderId = item.orderId;
    const deliveryStatus = item.orderDeliveryId
      ? deliveryStatusById.get(item.orderDeliveryId)
      : null;
    if (deliveryStatus === "cancelled") continue;

    if (item.packingStatus !== "packed") continue;

    const current = packedMap.get(orderId) ?? emptyQtyStat();
    packedMap.set(
      orderId,
      sumQtyStat(current, {
        total: toNumber(item.qty),
        lhQty: toNumber(item.lhQty),
        rhQty: toNumber(item.rhQty),
      }),
    );
  }

  return packedMap;
}

async function loadOrderLevelData(orderIds: number[], db: Db) {
  const itemControls = await db.salesItemControl.findMany({
    where: {
      salesId: { in: orderIds },
      deletedAt: null,
    },
    select: {
      uid: true,
      salesId: true,
    },
  });

  const controlUids = itemControls.map((c) => c.uid);

  const [qtyControls, deliveries, deliveryItems] = await Promise.all([
    controlUids.length
      ? db.qtyControl.findMany({
          where: {
            itemControlUid: { in: controlUids },
            deletedAt: null,
            type: { in: QTY_CONTROL_TYPES },
          },
          select: {
            itemControlUid: true,
            type: true,
            total: true,
            lh: true,
            rh: true,
          },
        })
      : Promise.resolve([]),
    db.orderDelivery.findMany({
      where: {
        salesOrderId: { in: orderIds },
        deletedAt: null,
      },
      select: {
        id: true,
        salesOrderId: true,
        status: true,
      },
    }),
    db.orderItemDelivery.findMany({
      where: {
        orderId: { in: orderIds },
        deletedAt: null,
      },
      select: {
        orderId: true,
        orderDeliveryId: true,
        qty: true,
        lhQty: true,
        rhQty: true,
        packingStatus: true,
      },
    }),
  ]);

  return { itemControls, qtyControls, deliveries, deliveryItems };
}

export async function withSalesControl<T extends { id: number }>(
  orders: T[],
  db: Db,
): Promise<WithStatistic<T>[]> {
  if (!orders.length) return [];

  const orderIds = [...new Set(orders.map((o) => o.id))];
  const { itemControls, qtyControls, deliveries, deliveryItems } =
    await loadOrderLevelData(orderIds, db);

  const orderControls = buildOrderControlMap(itemControls, qtyControls);
  const packedByOrder = buildOrderPackedMap(deliveries, deliveryItems);

  return orders.map((order) => {
    const aggregate = orderControls.get(order.id) ?? emptyOrderAggregate();
    const packed = packedByOrder.get(order.id) ?? emptyQtyStat();

    const dispatchStatus = deriveDispatchStatusFromControls(aggregate);
    return {
      ...order,
      statistic: toStatistic(aggregate, packed, dispatchStatus),
    };
  });
}

export async function withDispatchControl<
  T extends { id: number; salesOrderId: number },
>(dispatches: T[], db: Db): Promise<WithStatistic<T>[]> {
  if (!dispatches.length) return [];

  const dispatchIds = [...new Set(dispatches.map((d) => d.id))];
  const orderIds = [...new Set(dispatches.map((d) => d.salesOrderId))];

  const { itemControls, qtyControls, deliveries, deliveryItems } =
    await loadOrderLevelData(orderIds, db);

  const [persistedDispatches] = await Promise.all([
    db.orderDelivery.findMany({
      where: {
        id: { in: dispatchIds },
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    }),
  ]);

  const orderControls = buildOrderControlMap(itemControls, qtyControls);
  const packedByOrder = buildOrderPackedMap(deliveries, deliveryItems);

  const dispatchStatusById = new Map<number, string | null>();
  for (const d of persistedDispatches) {
    dispatchStatusById.set(d.id, d.status);
  }

  return dispatches.map((dispatch) => {
    const aggregate =
      orderControls.get(dispatch.salesOrderId) ?? emptyOrderAggregate();
    const packed = packedByOrder.get(dispatch.salesOrderId) ?? emptyQtyStat();

    const storedStatus = dispatchStatusById.get(dispatch.id);
    const dispatchStatus = isDispatchStatus(storedStatus)
      ? storedStatus
      : deriveDispatchStatusFromControls(aggregate);

    return {
      ...dispatch,
      statistic: toStatistic(aggregate, packed, dispatchStatus),
    };
  });
}

export const __withSalesControlTestUtils = {
  deriveDispatchStatusFromControls,
  deriveProductionStatus,
  toStatistic,
};
