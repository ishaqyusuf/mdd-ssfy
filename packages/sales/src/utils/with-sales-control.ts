import type { Db } from "@gnd/db";
import type { SalesDispatchStatus, SalesStatStatus } from "../types";

export type ProgressStat = { pending: number; completed: number; total: number };
export type PackableStat = { total: number };

export type SalesControlStatistic = {
  assignment: ProgressStat;
  submission: ProgressStat;
  packed: ProgressStat;
  packable: PackableStat;
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

type OrderControlAggregate = {
  qty: number;
  prodAssigned: number;
  prodCompleted: number;
  dispatchAssigned: number;
  dispatchInProgress: number;
  dispatchCompleted: number;
  dispatchCancelled: number;
};

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
  value: string | null | undefined
): value is SalesDispatchStatus {
  return !!value && DISPATCH_STATUSES.includes(value as SalesDispatchStatus);
}

function toNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function clampPending(total: number, completed: number) {
  return Math.max(total - completed, 0);
}

function emptyOrderAggregate(): OrderControlAggregate {
  return {
    qty: 0,
    prodAssigned: 0,
    prodCompleted: 0,
    dispatchAssigned: 0,
    dispatchInProgress: 0,
    dispatchCompleted: 0,
    dispatchCancelled: 0,
  };
}

function deriveProductionStatus(
  totalAssignment: number,
  completedSubmission: number
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
  >
): SalesDispatchStatus | "unknown" {
  const queued = toNumber(controls.dispatchAssigned);
  const inProgress = toNumber(controls.dispatchInProgress);
  const completed = toNumber(controls.dispatchCompleted);
  const cancelled = toNumber(controls.dispatchCancelled);
  const nonCancelledTarget = queued + inProgress + completed;

  if (nonCancelledTarget > 0 && completed >= nonCancelledTarget)
    return "completed";
  if (inProgress > 0) return "in progress";
  if (queued > 0) return "queue";
  if (cancelled > 0) return "cancelled";
  return "unknown";
}

function deriveDispatchStatusFromPacked(packed: ProgressStat): SalesDispatchStatus {
  if (packed.total > 0 && packed.completed >= packed.total) return "completed";
  if (packed.completed > 0) return "in progress";
  return "queue";
}

function toStatistic(
  aggregate: OrderControlAggregate,
  packed: ProgressStat,
  dispatchStatus: SalesDispatchStatus | "unknown"
): SalesControlStatistic {
  const assignmentTotal = toNumber(aggregate.qty);
  const assignmentCompleted = toNumber(aggregate.prodAssigned);
  const assignment: ProgressStat = {
    total: assignmentTotal,
    completed: assignmentCompleted,
    pending: clampPending(assignmentTotal, assignmentCompleted),
  };

  const submissionTotal = assignmentCompleted;
  const submissionCompleted = toNumber(aggregate.prodCompleted);
  const submission: ProgressStat = {
    total: submissionTotal,
    completed: submissionCompleted,
    pending: clampPending(submissionTotal, submissionCompleted),
  };

  const packable: PackableStat = {
    total: Math.max(assignmentTotal - packed.completed, 0),
  };

  return {
    assignment,
    submission,
    packed,
    packable,
    productionStatus: deriveProductionStatus(
      assignment.total,
      submission.completed
    ),
    dispatchStatus,
  };
}

function buildOrderControlMap(
  itemControls: { uid: string; salesId: number }[],
  qtyControls: { itemControlUid: string; type: string; total: number | null }[]
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
    current[type] += toNumber(control.total);
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
    packingStatus: string | null;
  }[]
): Map<number, ProgressStat> {
  const deliveryStatusById = new Map<number, string | null>();
  for (const d of deliveries) {
    deliveryStatusById.set(d.id, d.status);
  }

  const packedMap = new Map<number, ProgressStat>();
  for (const item of deliveryItems) {
    const orderId = item.orderId;
    const deliveryStatus = item.orderDeliveryId
      ? deliveryStatusById.get(item.orderDeliveryId)
      : null;
    if (deliveryStatus === "cancelled") continue;

    const current = packedMap.get(orderId) ?? {
      total: 0,
      completed: 0,
      pending: 0,
    };

    const qty = toNumber(item.qty);
    current.total += qty;
    if (item.packingStatus === "packed") {
      current.completed += qty;
    }
    packedMap.set(orderId, current);
  }

  for (const [, stat] of packedMap) {
    stat.pending = clampPending(stat.total, stat.completed);
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
        packingStatus: true,
      },
    }),
  ]);

  return { itemControls, qtyControls, deliveries, deliveryItems };
}

export async function withSalesControl<T extends { id: number }>(
  orders: T[],
  db: Db
): Promise<WithStatistic<T>[]> {
  if (!orders.length) return [];

  const orderIds = [...new Set(orders.map((o) => o.id))];
  const { itemControls, qtyControls, deliveries, deliveryItems } =
    await loadOrderLevelData(orderIds, db);

  const orderControls = buildOrderControlMap(itemControls, qtyControls);
  const packedByOrder = buildOrderPackedMap(deliveries, deliveryItems);

  return orders.map((order) => {
    const aggregate = orderControls.get(order.id) ?? emptyOrderAggregate();
    const packed = packedByOrder.get(order.id) ?? {
      total: 0,
      completed: 0,
      pending: 0,
    };

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

  const { itemControls, qtyControls } = await loadOrderLevelData(orderIds, db);

  const [deliveryItems, persistedDispatches] = await Promise.all([
    db.orderItemDelivery.findMany({
      where: {
        orderDeliveryId: { in: dispatchIds },
        deletedAt: null,
      },
      select: {
        orderDeliveryId: true,
        qty: true,
        packingStatus: true,
      },
    }),
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

  const packedByDispatch = new Map<number, ProgressStat>();
  for (const item of deliveryItems) {
    if (!item.orderDeliveryId) continue;
    const current = packedByDispatch.get(item.orderDeliveryId) ?? {
      total: 0,
      completed: 0,
      pending: 0,
    };

    const qty = toNumber(item.qty);
    current.total += qty;
    if (item.packingStatus === "packed") {
      current.completed += qty;
    }
    packedByDispatch.set(item.orderDeliveryId, current);
  }
  for (const [, stat] of packedByDispatch) {
    stat.pending = clampPending(stat.total, stat.completed);
  }

  const dispatchStatusById = new Map<number, string | null>();
  for (const d of persistedDispatches) {
    dispatchStatusById.set(d.id, d.status);
  }

  return dispatches.map((dispatch) => {
    const aggregate =
      orderControls.get(dispatch.salesOrderId) ?? emptyOrderAggregate();
    const packed = packedByDispatch.get(dispatch.id) ?? {
      total: 0,
      completed: 0,
      pending: 0,
    };

    const storedStatus = dispatchStatusById.get(dispatch.id);
    const dispatchStatus = isDispatchStatus(storedStatus)
      ? storedStatus
      : deriveDispatchStatusFromPacked(packed);

    return {
      ...dispatch,
      statistic: toStatistic(aggregate, packed, dispatchStatus),
    };
  });
}

export const __withSalesControlTestUtils = {
  deriveDispatchStatusFromControls,
  deriveDispatchStatusFromPacked,
  deriveProductionStatus,
  toStatistic,
};
