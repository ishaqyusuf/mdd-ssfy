import { whereDispatch } from "@api/prisma-where";
import { composeQueryData } from "@gnd/utils/query-response";
import type {
  CompletionModeSchema,
  DispatchStatusSchema,
  DispatchQueryParamsSchema,
  SalesDispatchOverviewSchema,
  UpdateDispatchDriverSchema,
  UpdateDispatchDueDateSchema,
  UpdateDispatchStatusSchema,
  UpdateSalesDeliveryOptionSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { QtyControlType } from "@api/type";
import type { Prisma } from "@gnd/db";
import type { SalesDispatchStatus } from "@gnd/utils/constants";
import {
  isControlReadV2Enabled,
  withDispatchControl,
  withDispatchListControl,
  withSalesListControl,
} from "@gnd/sales";
import { tasks } from "@trigger.dev/sdk/v3";
import type { NotificationJobInput } from "@notifications/schemas";
import { TRPCError } from "@trpc/server";

import { qtyMatrixSum, transformQtyHandle } from "@sales/utils/sales-control";
import { getSalesDispatchOverview } from "@sales/exports";
import { qtyMatrixDifference, recomposeQty } from "@sales/utils/sales-control";

function isControlReadParityEnabled() {
  return ["1", "true", "yes", "on"].includes(
    String(process.env.CONTROL_READ_PARITY || "")
      .trim()
      .toLowerCase(),
  );
}

function emptyQtyStat() {
  return {
    lhQty: 0,
    rhQty: 0,
    qty: 0,
    total: 0,
  };
}

function toLegacyDispatchStatistic(control: any) {
  const packed = control?.packed || emptyQtyStat();
  const pendingPacking = control?.pendingPacking || emptyQtyStat();
  return {
    qty: emptyQtyStat(),
    prodAssigned: emptyQtyStat(),
    prodCompleted: emptyQtyStat(),
    dispatchAssigned: control?.dispatchAssigned || emptyQtyStat(),
    dispatchInProgress: control?.dispatchInProgress || emptyQtyStat(),
    dispatchCompleted: control?.dispatchCompleted || emptyQtyStat(),
    dispatchCancelled: emptyQtyStat(),
    pendingAssignment: emptyQtyStat(),
    pendingSubmission: emptyQtyStat(),
    packables: control?.packables || emptyQtyStat(),
    pendingPacking,
    pendingDispatch: emptyQtyStat(),
    packed,
    productionStatus: "unknown",
    dispatchStatus: control?.dispatchStatus || "unknown",
  };
}

export async function getDispatches(
  ctx: TRPCContext,
  query: DispatchQueryParamsSchema,
) {
  const { db } = ctx;
  query.sort = ["dueDate", "createdAt"];
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereDispatch(query),
    db.orderDelivery,
  );
  const data = await db.orderDelivery.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      status: true,
      createdAt: true,
      dueDate: true,
      deliveryMode: true,
      driverId: true,
      order: {
        select: {
          stat: {
            where: {
              type: "dispatchCompleted" as QtyControlType,
              deletedAt: null,
            },
            select: {
              percentage: true,
            },
          },
          createdAt: true,
          orderId: true,
          id: true,
          customer: {
            select: {
              name: true,
              businessName: true,
              phoneNo: true,
            },
          },
          shippingAddress: {
            select: {
              name: true,
              phoneNo: true,
              address1: true,
              address2: true,
              city: true,
              state: true,
              country: true,
            },
          },
        },
      },
      driver: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  const orderControlRows = await withSalesListControl(
    [...new Map(data.map((row) => [row.order.id, { id: row.order.id }])).values()],
    db as any,
    ["packed", "pendingPacking", "dispatchStatus"] as any,
  );
  const orderControlById = new Map(
    orderControlRows.map((row) => [row.id, (row as any).control]),
  );

  if (isControlReadV2Enabled()) {
    if (isControlReadParityEnabled()) {
      const legacyRows = await withDispatchControl(
        data.map((a) => ({
          ...a,
          salesOrderId: a.order.id,
        })),
        db,
      );
      const v2Rows = await withDispatchListControl(
        data.map((a) => ({
          ...a,
          salesOrderId: a.order.id,
        })),
        db,
      );
      const legacyById = new Map(legacyRows.map((row) => [row.id, row]));
      const mismatches: number[] = [];
      for (const row of v2Rows) {
        const legacy = legacyById.get(row.id) as any;
        const v2 = (row as any).control;
        if (!legacy || !v2) continue;
        if (
          legacy.statistic?.dispatchStatus !== v2.dispatchStatus ||
          legacy.statistic?.packed?.total !== v2.packed?.total ||
          legacy.statistic?.pendingPacking?.total !== v2.pendingPacking?.total
        ) {
          mismatches.push(row.id);
        }
      }
      if (mismatches.length) {
        console.warn("[control-read-parity][dispatch] mismatches", {
          mismatchCount: mismatches.length,
          dispatchIds: mismatches.slice(0, 20),
        });
      }
    }

    const rowsWithControl = await withDispatchListControl(
      data.map((a) => ({
        ...a,
        salesOrderId: a.order.id,
      })),
      db,
    );

    return await response(
      rowsWithControl.map((a) => {
        const { salesOrderId, ...rest } = a as typeof a & {
          salesOrderId: number;
        };
        return {
          ...rest,
          order: {
            ...rest.order,
            control: orderControlById.get(rest.order.id) || null,
          },
          statistic: toLegacyDispatchStatistic((a as any).control),
          uid: String(a.id),
        };
      }),
    );
  }

  const rowsWithStatistic = await withDispatchControl(
    data.map((a) => ({
      ...a,
      salesOrderId: a.order.id,
    })),
    db,
  );
  return await response(
    rowsWithStatistic.map((a) => ({
      ...a,
      order: {
        ...(a as any).order,
        control: orderControlById.get((a as any).order?.id) || null,
      },
      uid: String(a.id),
    })),
  );
}

export async function getSalesDeliveryInfo(ctx: TRPCContext, salesId) {
  const sale = await ctx.db.salesOrders.findFirstOrThrow({
    where: {
      id: salesId,
      type: "order",
    },
    select: {
      id: true,
      deliveryOption: true,
      deliveries: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          deliveryMode: true,
          dueDate: true,
          status: true,
        },
      },
    },
  });
  return sale;
}
export async function updateSalesDeliveryOption(
  ctx: TRPCContext,
  data: UpdateSalesDeliveryOptionSchema,
) {
  if (data.option && !data.deliveryId) {
    await ctx.db.salesOrders.update({
      where: { id: data.salesId },
      data: {
        deliveryOption: data.option,
      },
    });
    return;
  }
  if (!data.deliveryId) {
    data.deliveryId = (
      await ctx.db.orderDelivery.create({
        data: {
          deliveryMode: data.option || data.defaultOption || "delivery",
          createdBy: {},
          driver: data.driverId
            ? {
                connect: {
                  id: data.driverId,
                },
              }
            : undefined,
          status: data.status || ("queue" as SalesDispatchStatus),
          dueDate: data.date,
          meta: {},
          order: {
            connect: { id: data.salesId },
          },
        },
      })
    ).id;
  } else {
    const updateData: Prisma.OrderDeliveryUpdateInput = {};
    Object.entries(data).map(([k, v]) => {
      const value = v as any;
      if (value === undefined) return;
      switch (k as keyof UpdateSalesDeliveryOptionSchema) {
        case "date":
          updateData.dueDate = value;
          break;
        case "driverId":
          updateData.driver = {
            connect: {
              id: value,
            },
          };
          break;
        case "option":
          updateData.deliveryMode = value;
          break;
        case "status":
          updateData.status = value;
          break;
      }
    });
    await ctx.db.orderDelivery.update({
      where: {
        id: data.deliveryId,
      },
      data: updateData,
    });
  }
}

type DispatchStatusNotificationChannel =
  | "sales_dispatch_queued"
  | "sales_dispatch_in_progress"
  | "sales_dispatch_completed"
  | "sales_dispatch_cancelled";

function mapStatusToNotificationChannel(
  status: DispatchStatusSchema,
): DispatchStatusNotificationChannel {
  switch (status) {
    case "queue":
      return "sales_dispatch_queued";
    case "in progress":
      return "sales_dispatch_in_progress";
    case "completed":
      return "sales_dispatch_completed";
    case "cancelled":
      return "sales_dispatch_cancelled";
  }
}

async function sendDispatchNotification(
  authorId: number,
  recipientId: number | null | undefined,
  channel:
    | DispatchStatusNotificationChannel
    | "sales_dispatch_assigned"
    | "sales_dispatch_unassigned"
    | "sales_dispatch_date_updated",
  payload: {
    orderNo?: string | null;
    dispatchId: number;
    deliveryMode?: "pickup" | "delivery" | null;
    dueDate?: Date | null;
    driverId?: number | null;
  },
) {
  if (!recipientId) return;

  await tasks.trigger("notification", {
    channel,
    author: {
      id: authorId,
      role: "employee",
    },
    recipients: [
      {
        ids: [recipientId],
        role: "employee",
      },
    ],
    payload: {
      orderNo: payload.orderNo || undefined,
      dispatchId: payload.dispatchId,
      deliveryMode: payload.deliveryMode || undefined,
      dueDate: payload.dueDate || undefined,
      driverId: payload.driverId || undefined,
    },
  } as NotificationJobInput);
}

type DispatchSelect = {
  id: number;
  status: string | null;
  driverId: number | null;
  dueDate: Date | null;
  deliveryMode: "pickup" | "delivery" | null;
  orderId: number;
  orderNo: string | null;
  packedCount: number;
  pendingCount: number;
};

async function getDispatchForUpdate(
  ctx: TRPCContext,
  dispatchId: number,
): Promise<DispatchSelect> {
  const dispatch = await ctx.db.orderDelivery.findFirst({
    where: {
      id: dispatchId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      driverId: true,
      dueDate: true,
      deliveryMode: true,
      order: {
        select: {
          id: true,
          orderId: true,
        },
      },
      items: {
        where: {
          deletedAt: null,
        },
        select: {
          packingStatus: true,
        },
      },
    },
  });
  if (!dispatch) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "DISPATCH_NOT_FOUND",
    });
  }
  const packedCount = dispatch.items.filter(
    (item) => item.packingStatus === "packed",
  ).length;
  const pendingCount = dispatch.items.filter(
    (item) => item.packingStatus !== "packed",
  ).length;

  return {
    id: dispatch.id,
    status: dispatch.status,
    driverId: dispatch.driverId,
    dueDate: dispatch.dueDate,
    deliveryMode: dispatch.deliveryMode as "pickup" | "delivery" | null,
    orderId: dispatch.order.id,
    orderNo: dispatch.order.orderId,
    packedCount,
    pendingCount,
  };
}

function isSameDate(
  left: Date | null | undefined,
  right: Date | null | undefined,
) {
  const leftVal = left ? new Date(left).getTime() : null;
  const rightVal = right ? new Date(right).getTime() : null;
  return leftVal === rightVal;
}

function isCompletionConfirmationRequired(dispatch: DispatchSelect) {
  return dispatch.packedCount === 0 || dispatch.pendingCount > 0;
}

export async function updateDispatchDriver(
  ctx: TRPCContext,
  input: UpdateDispatchDriverSchema,
) {
  const dispatch = await getDispatchForUpdate(ctx, input.dispatchId);
  const oldDriverId = input.oldDriverId ?? null;
  const newDriverId = input.newDriverId ?? null;

  if ((dispatch.driverId ?? null) !== oldDriverId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "CONFLICT_STALE_DRIVER",
    });
  }
  if (oldDriverId === newDriverId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "NO_OP_DRIVER_UPDATE",
    });
  }

  await ctx.db.orderDelivery.update({
    where: {
      id: dispatch.id,
    },
    data: {
      driver: newDriverId ? { connect: { id: newDriverId } } : { disconnect: true },
    },
  });

  await sendDispatchNotification(
    ctx.userId!,
    oldDriverId,
    "sales_dispatch_unassigned",
    {
      orderNo: dispatch.orderNo,
      dispatchId: dispatch.id,
      deliveryMode: dispatch.deliveryMode,
      dueDate: dispatch.dueDate,
      driverId: oldDriverId,
    },
  );
  await sendDispatchNotification(
    ctx.userId!,
    newDriverId,
    "sales_dispatch_assigned",
    {
      orderNo: dispatch.orderNo,
      dispatchId: dispatch.id,
      deliveryMode: dispatch.deliveryMode,
      dueDate: dispatch.dueDate,
      driverId: newDriverId,
    },
  );

  return {
    ok: true,
    dispatchId: dispatch.id,
    orderId: dispatch.orderId,
    orderNo: dispatch.orderNo,
    oldDriverId,
    newDriverId,
    dueDate: dispatch.dueDate,
    deliveryMode: dispatch.deliveryMode,
    notifications: [
      oldDriverId ? "sales_dispatch_unassigned" : null,
      newDriverId ? "sales_dispatch_assigned" : null,
    ].filter(Boolean),
  };
}

export async function updateDispatchDueDate(
  ctx: TRPCContext,
  input: UpdateDispatchDueDateSchema,
) {
  const dispatch = await getDispatchForUpdate(ctx, input.dispatchId);
  const oldDueDate = input.oldDueDate ?? null;

  if (!isSameDate(dispatch.dueDate, oldDueDate)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "CONFLICT_STALE_DUE_DATE",
    });
  }
  if (isSameDate(dispatch.dueDate, input.newDueDate)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "NO_OP_DUE_DATE_UPDATE",
    });
  }

  await ctx.db.orderDelivery.update({
    where: {
      id: dispatch.id,
    },
    data: {
      dueDate: input.newDueDate,
    },
  });

  await sendDispatchNotification(
    ctx.userId!,
    dispatch.driverId,
    "sales_dispatch_date_updated",
    {
      orderNo: dispatch.orderNo,
      dispatchId: dispatch.id,
      deliveryMode: dispatch.deliveryMode,
      dueDate: input.newDueDate,
      driverId: dispatch.driverId,
    },
  );

  return {
    ok: true,
    dispatchId: dispatch.id,
    orderId: dispatch.orderId,
    orderNo: dispatch.orderNo,
    driverId: dispatch.driverId,
    oldDueDate,
    newDueDate: input.newDueDate,
    deliveryMode: dispatch.deliveryMode,
    notifications: ["sales_dispatch_date_updated"],
  };
}

export async function updateDispatchStatus(
  ctx: TRPCContext,
  input: UpdateDispatchStatusSchema,
) {
  const dispatch = await getDispatchForUpdate(ctx, input.dispatchId);
  const oldStatus = input.oldStatus;
  const newStatus = input.newStatus;

  if (dispatch.status !== oldStatus) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "CONFLICT_STALE_STATUS",
    });
  }
  if (oldStatus === newStatus) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "NO_OP_STATUS_UPDATE",
    });
  }

  if (
    newStatus === "completed" &&
    isCompletionConfirmationRequired(dispatch) &&
    input.completionMode !== "packed_only"
  ) {
    return {
      ok: false,
      confirmationRequired: true,
      code: "DISPATCH_COMPLETION_CONFIRMATION_REQUIRED",
      dispatchId: dispatch.id,
      oldStatus,
      requestedStatus: "completed",
      packedCount: dispatch.packedCount,
      pendingCount: dispatch.pendingCount,
      actions: ["packed_only", "complete_all"],
      message:
        "Some items were not packed. Completing this dispatch may open back-order on the order.",
    };
  }

  await ctx.db.orderDelivery.update({
    where: {
      id: dispatch.id,
    },
    data: {
      status: newStatus as SalesDispatchStatus,
    },
  });

  const channel = mapStatusToNotificationChannel(newStatus);
  await sendDispatchNotification(
    ctx.userId!,
    dispatch.driverId,
    channel,
    {
      orderNo: dispatch.orderNo,
      dispatchId: dispatch.id,
      deliveryMode: dispatch.deliveryMode,
      dueDate: dispatch.dueDate,
      driverId: dispatch.driverId,
    },
  );

  return {
    ok: true,
    confirmationRequired: false,
    dispatchId: dispatch.id,
    orderId: dispatch.orderId,
    orderNo: dispatch.orderNo,
    oldStatus,
    newStatus,
    packedCount: dispatch.packedCount,
    pendingCount: dispatch.pendingCount,
    completionMode: (input.completionMode ?? null) as CompletionModeSchema | null,
    notifications: [channel],
  };
}

export async function getDispatchOverview(
  ctx: TRPCContext,
  query: SalesDispatchOverviewSchema,
) {
  const result = await getSalesDispatchOverview(ctx.db, {
    salesId: query.salesId,
    salesNo: query.salesNo,
  });

  const dispatch = result.deliveries.find((d) => d.id === query.dispatchId);
  let address = result.order.shippingAddress;
  if (!address) address = {} as any;
  const order = result.order;
  const orderWithControl = await withSalesListControl(
    [{ id: order.id }],
    ctx.db as any,
    ["packed", "pendingPacking", "dispatchStatus"] as any,
  );
  const orderControl = (orderWithControl?.[0] as any)?.control;
  return {
    dispatch,
    dispatchItems: result.order.itemControls.map((item) => {
      const listedItems = dispatch?.items.filter(
        (a) => a.item?.controlUid == item.uid,
      );
      const packedItems = listedItems?.filter(
        (a) => !("packingStatus" in a) || a.packingStatus === "packed",
      );
      const totalListedQty = recomposeQty(
        qtyMatrixSum(
          ...result.deliveries
            .map((d) =>
              d.items
                .filter((i) => i.item.controlUid === item.uid)
                .map(transformQtyHandle)
                .flat(),
            )
            .flat(),
        ),
      );
      const trs = listedItems?.map(transformQtyHandle);
      const listedQty = qtyMatrixSum(...(trs || ([] as any)));
      const packedQty = qtyMatrixSum(
        ...((packedItems || []).map(transformQtyHandle) as any),
      );

      const dispatchable = result.dispatchables.find((d) => d.uid === item.uid);
      const deliverableQty = recomposeQty(
        qtyMatrixSum(...(dispatchable?.deliverables?.map((a) => a.qty) || [])),
      );
      const nonDeliverableQty = recomposeQty(
        qtyMatrixDifference(
          dispatchable?.totalQty!,
          qtyMatrixSum(deliverableQty, totalListedQty),
        ),
      );
      let packingHistory = listedItems?.map((a) => ({
        qty: transformQtyHandle(a),
        date: a.createdAt,
        note: "",
        packedBy: a.packedBy,
        id: a.id,
        packingUid: a.packingUid,
      }))!;
      packingHistory = packingHistory
        .filter(
          (p, o) =>
            !p.packingUid ||
            (p.packingUid &&
              packingHistory?.findIndex((a) => a.packingUid === p.packingUid) ==
                o),
        )
        .map((d) => ({
          ...d,
          qty: !d.packingUid
            ? d.qty
            : qtyMatrixSum(
                ...packingHistory?.filter(
                  (p) => p.packingUid === d.packingUid,
                )!,
              ),
        }));
      return {
        title: item.title,
        img: dispatchable?.img || null,
        sectionTitle: item.sectionTitle,
        subtitle: dispatchable?.subtitle,
        uid: item.uid,
        deliverables: dispatchable?.deliverables,
        deliverableQty,
        dispatchable,
        listedQty,
        packedQty,
        nonDeliverableQty,
        // availableQty,
        // pendingQty,
        // listedQty,
        totalQty: dispatchable?.totalQty!,
        // dispatchable,
        salesItemId: dispatchable?.itemId,
        packingHistory,
        // itemConfig: item.produceable
      };
    }),
    address: address || ({} as any),
    // scheduleDate: dispatch?.dueDate,
    order: {
      orderId: order.orderId,
      date: order.createdAt,
      id: order.id,
      control: orderControl,
    },
    // orderRequiresUpdate: result.orderRequiresUpdate,
  };
}

export async function enlistItemToForDispatch(ctx: TRPCContext) {
  //
}
