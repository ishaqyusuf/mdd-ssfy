import type { Db } from "@gnd/db";
import type { SalesDispatchStatus, SalesStatStatus } from "../types";

export type QtyStat = {
  lhQty: number;
  rhQty: number;
  qty: number;
  total: number;
};

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

type ControlStats = Record<QtyControlType, QtyStat>;

type ItemControlRef = {
  uid: string;
  salesId: number;
  produceable: boolean;
  shippable: boolean;
};

type ControlWithStats = ItemControlRef & {
  stats: ControlStats;
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

function isControlDebugEnabled() {
  const flag = String(process.env.CONTROL_DEBUG ?? "")
    .trim()
    .toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

function controlDebugLog(label: string, payload: Record<string, unknown>) {
  if (!isControlDebugEnabled()) return;
  console.log(`[sales-control] ${label}`, payload);
}

function isDispatchStatus(
  value: string | null | undefined,
): value is SalesDispatchStatus {
  return !!value && DISPATCH_STATUSES.includes(value as SalesDispatchStatus);
}

function toNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function toQtyStat(input?: Partial<QtyStat> | null): QtyStat {
  const lhQty = Math.max(toNumber(input?.lhQty), 0);
  const rhQty = Math.max(toNumber(input?.rhQty), 0);
  const qty = Math.max(toNumber(input?.qty), 0);
  const hasHandleQty = lhQty > 0 || rhQty > 0;
  const derivedTotal = hasHandleQty ? lhQty + rhQty : qty;
  const total =
    input?.total === undefined || input?.total === null
      ? derivedTotal
      : Math.max(toNumber(input.total), 0);
  return {
    lhQty,
    rhQty,
    qty,
    total,
  };
}

function emptyQtyStat(): QtyStat {
  return toQtyStat();
}

function emptyControlStats(): ControlStats {
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

function sumQtyStat(...stats: (QtyStat | null | undefined)[]): QtyStat {
  return toQtyStat(
    stats.filter(Boolean).reduce(
      (acc, stat) => ({
        lhQty: toNumber(acc.lhQty) + toNumber(stat?.lhQty),
        rhQty: toNumber(acc.rhQty) + toNumber(stat?.rhQty),
        qty: toNumber(acc.qty) + toNumber(stat?.qty),
        total: toNumber(acc.total) + toNumber(stat?.total),
      }),
      { lhQty: 0, rhQty: 0, qty: 0, total: 0 },
    ),
  );
}

function diffQtyStat(base: QtyStat, subtract: QtyStat): QtyStat {
  return toQtyStat({
    lhQty: Math.max(toNumber(base.lhQty) - toNumber(subtract.lhQty), 0),
    rhQty: Math.max(toNumber(base.rhQty) - toNumber(subtract.rhQty), 0),
    qty: Math.max(toNumber(base.qty) - toNumber(subtract.qty), 0),
    total: Math.max(toNumber(base.total) - toNumber(subtract.total), 0),
  });
}

function sumControls(
  controls: ControlWithStats[],
  type: QtyControlType,
  predicate?: (control: ControlWithStats) => boolean,
): QtyStat {
  return sumQtyStat(
    ...controls
      .filter((control) => (predicate ? predicate(control) : true))
      .map((control) => control.stats[type]),
  );
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
    SalesControlStatistic,
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
  controls: ControlWithStats[],
  packed: QtyStat,
  dispatchStatus: SalesDispatchStatus | "unknown",
): SalesControlStatistic {
  const qty = sumControls(controls, "qty");
  const prodAssigned = sumControls(controls, "prodAssigned");
  const prodCompleted = sumControls(controls, "prodCompleted");
  const dispatchAssigned = sumControls(controls, "dispatchAssigned");
  const dispatchInProgress = sumControls(controls, "dispatchInProgress");
  const dispatchCompleted = sumControls(controls, "dispatchCompleted");
  const dispatchCancelled = sumControls(controls, "dispatchCancelled");

  // Production pipeline metrics apply to produceable controls.
  const produceableQty = sumControls(
    controls,
    "qty",
    (control) => control.produceable,
  );
  const produceableAssigned = sumControls(
    controls,
    "prodAssigned",
    (control) => control.produceable,
  );
  const produceableCompleted = sumControls(
    controls,
    "prodCompleted",
    (control) => control.produceable,
  );
  const pendingAssignment = diffQtyStat(produceableQty, produceableAssigned);
  const pendingSubmission = diffQtyStat(
    produceableAssigned,
    produceableCompleted,
  );

  // Dispatch pipeline availability: produceable items depend on prodCompleted,
  // non-produceable deliverables can ship directly from qty.
  const dispatchableSource = sumQtyStat(
    ...controls
      .filter((control) => control.shippable)
      .map((control) =>
        control.produceable ? control.stats.prodCompleted : control.stats.qty,
      ),
  );
  const dispatchListed = sumControls(
    controls,
    "dispatchAssigned",
    (control) => control.shippable,
  );
  const dispatchListedInProgress = sumControls(
    controls,
    "dispatchInProgress",
    (control) => control.shippable,
  );
  const dispatchListedCompleted = sumControls(
    controls,
    "dispatchCompleted",
    (control) => control.shippable,
  );
  const listedDispatchQty = sumQtyStat(
    dispatchListed,
    dispatchListedInProgress,
    dispatchListedCompleted,
  );

  const packables = diffQtyStat(dispatchableSource, listedDispatchQty);
  const pendingDispatch = diffQtyStat(
    sumControls(controls, "qty", (control) => control.shippable),
    listedDispatchQty,
  );
  const pendingPacking = diffQtyStat(
    sumControls(controls, "qty", (control) => control.shippable),
    packed,
  );

  const productionStatus = deriveProductionStatus(
    produceableQty.total,
    produceableCompleted.total,
  );

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
    productionStatus,
    dispatchStatus,
  };
}

function buildControlsByOrderMap(
  itemControls: ItemControlRef[],
  qtyControls: {
    itemControlUid: string;
    type: string;
    qty: number | null;
    lh: number | null;
    rh: number | null;
  }[],
): Map<number, ControlWithStats[]> {
  const byUid = new Map<string, ControlWithStats>();
  for (const control of itemControls) {
    byUid.set(control.uid, {
      ...control,
      produceable: !!control.produceable,
      shippable: !!control.shippable,
      stats: emptyControlStats(),
    });
  }

  for (const control of qtyControls) {
    const target = byUid.get(control.itemControlUid);
    if (!target) continue;

    const type = control.type as QtyControlType;
    if (!QTY_CONTROL_TYPES.includes(type)) continue;

    target.stats[type] = sumQtyStat(target.stats[type],
      toQtyStat({
        lhQty: toNumber(control.lh),
        rhQty: toNumber(control.rh),
        qty: toNumber(control.qty),
      }),
    );
  }

  const byOrder = new Map<number, ControlWithStats[]>();
  for (const control of byUid.values()) {
    const list = byOrder.get(control.salesId) || [];
    list.push(control);
    byOrder.set(control.salesId, list);
  }

  return byOrder;
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
      sumQtyStat(
        current,
        toQtyStat({
          lhQty: toNumber(item.lhQty),
          rhQty: toNumber(item.rhQty),
          qty: toNumber(item.qty),
        }),
      ),
    );
  }

  return packedMap;
}

function buildDispatchPackedMap(
  deliveries: { id: number; status: string | null }[],
  deliveryItems: {
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
    if (!item.orderDeliveryId) continue;
    const deliveryStatus = deliveryStatusById.get(item.orderDeliveryId);
    if (deliveryStatus === "cancelled") continue;
    if (item.packingStatus !== "packed") continue;

    const current = packedMap.get(item.orderDeliveryId) ?? emptyQtyStat();
    packedMap.set(
      item.orderDeliveryId,
      sumQtyStat(
        current,
        toQtyStat({
          lhQty: toNumber(item.lhQty),
          rhQty: toNumber(item.rhQty),
          qty: toNumber(item.qty),
        }),
      ),
    );
  }

  return packedMap;
}

function buildDispatchListedMap(
  deliveries: { id: number; status: string | null }[],
  deliveryItems: {
    orderDeliveryId: number | null;
    qty: number;
    lhQty: number | null;
    rhQty: number | null;
  }[],
): Map<number, QtyStat> {
  const deliveryStatusById = new Map<number, string | null>();
  for (const d of deliveries) {
    deliveryStatusById.set(d.id, d.status);
  }

  const listedMap = new Map<number, QtyStat>();
  for (const item of deliveryItems) {
    if (!item.orderDeliveryId) continue;
    const deliveryStatus = deliveryStatusById.get(item.orderDeliveryId);
    if (deliveryStatus === "cancelled") continue;

    const current = listedMap.get(item.orderDeliveryId) ?? emptyQtyStat();
    listedMap.set(
      item.orderDeliveryId,
      sumQtyStat(
        current,
        toQtyStat({
          lhQty: toNumber(item.lhQty),
          rhQty: toNumber(item.rhQty),
          qty: toNumber(item.qty),
        }),
      ),
    );
  }

  return listedMap;
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
      produceable: true,
      shippable: true,
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
            qty: true,
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

  controlDebugLog("withSalesControl.loadOrderLevelData", {
    orderCount: orders.length,
    itemControlCount: itemControls.length,
    qtyControlCount: qtyControls.length,
    deliveryCount: deliveries.length,
    deliveryItemCount: deliveryItems.length,
  });

  const controlsByOrder = buildControlsByOrderMap(itemControls, qtyControls);
  const packedByOrder = buildOrderPackedMap(deliveries, deliveryItems);

  return orders.map((order) => {
    const controls = controlsByOrder.get(order.id) || [];
    const packed = packedByOrder.get(order.id) ?? emptyQtyStat();

    const baseDispatchControls = {
      dispatchAssigned: sumControls(controls, "dispatchAssigned"),
      dispatchInProgress: sumControls(controls, "dispatchInProgress"),
      dispatchCompleted: sumControls(controls, "dispatchCompleted"),
      dispatchCancelled: sumControls(controls, "dispatchCancelled"),
    };
    const dispatchStatus = deriveDispatchStatusFromControls(baseDispatchControls);
    const statistic = toStatistic(controls, packed, dispatchStatus);

    controlDebugLog("withSalesControl.orderStatistic", {
      orderId: order.id,
      controlCount: controls.length,
      packed,
      dispatchStatus,
      qty: statistic.qty,
      prodAssigned: statistic.prodAssigned,
      prodCompleted: statistic.prodCompleted,
      pendingAssignment: statistic.pendingAssignment,
      pendingSubmission: statistic.pendingSubmission,
      packables: statistic.packables,
      pendingPacking: statistic.pendingPacking,
      pendingDispatch: statistic.pendingDispatch,
      dispatchAssigned: statistic.dispatchAssigned,
      dispatchInProgress: statistic.dispatchInProgress,
      dispatchCompleted: statistic.dispatchCompleted,
      dispatchCancelled: statistic.dispatchCancelled,
    });

    return {
      ...order,
      statistic,
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
        lhQty: true,
        rhQty: true,
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

  controlDebugLog("withDispatchControl.loadDispatchLevelData", {
    dispatchCount: dispatches.length,
    orderCount: orderIds.length,
    itemControlCount: itemControls.length,
    qtyControlCount: qtyControls.length,
    persistedDispatchCount: persistedDispatches.length,
    deliveryItemCount: deliveryItems.length,
  });

  const controlsByOrder = buildControlsByOrderMap(itemControls, qtyControls);
  const packedByDispatch = buildDispatchPackedMap(
    persistedDispatches,
    deliveryItems,
  );
  const listedByDispatch = buildDispatchListedMap(
    persistedDispatches,
    deliveryItems,
  );

  const dispatchStatusById = new Map<number, string | null>();
  for (const d of persistedDispatches) {
    dispatchStatusById.set(d.id, d.status);
  }

  return dispatches.map((dispatch) => {
    const controls = controlsByOrder.get(dispatch.salesOrderId) || [];
    const packed = packedByDispatch.get(dispatch.id) ?? emptyQtyStat();
    const listed = listedByDispatch.get(dispatch.id) ?? emptyQtyStat();

    const storedStatus = dispatchStatusById.get(dispatch.id);
    const dispatchStatus =
      isDispatchStatus(storedStatus)
        ? storedStatus
        : deriveDispatchStatusFromControls({
            dispatchAssigned: sumControls(controls, "dispatchAssigned"),
            dispatchInProgress: sumControls(controls, "dispatchInProgress"),
            dispatchCompleted: sumControls(controls, "dispatchCompleted"),
            dispatchCancelled: sumControls(controls, "dispatchCancelled"),
          });

    const statistic = toStatistic(controls, packed, dispatchStatus);
    statistic.pendingPacking = diffQtyStat(listed, packed);

    controlDebugLog("withDispatchControl.dispatchStatistic", {
      dispatchId: dispatch.id,
      salesOrderId: dispatch.salesOrderId,
      storedStatus,
      derivedStatus: dispatchStatus,
      controlCount: controls.length,
      listed,
      packed,
      qty: statistic.qty,
      packables: statistic.packables,
      pendingPacking: statistic.pendingPacking,
      pendingDispatch: statistic.pendingDispatch,
      packedStat: statistic.packed,
      dispatchAssigned: statistic.dispatchAssigned,
      dispatchInProgress: statistic.dispatchInProgress,
      dispatchCompleted: statistic.dispatchCompleted,
      dispatchCancelled: statistic.dispatchCancelled,
    });

    return {
      ...dispatch,
      statistic,
    };
  });
}

export const __withSalesControlTestUtils = {
  deriveDispatchStatusFromControls,
  deriveProductionStatus,
  toStatistic,
};
