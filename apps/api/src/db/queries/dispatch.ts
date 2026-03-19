import { whereDispatch } from "@api/prisma-where";
import { composeQueryData } from "@gnd/utils/query-response";
import type {
  CompletionModeSchema,
  DispatchStatusSchema,
  DispatchQueryParamsSchema,
  ResolveDuplicateDispatchGroupSchema,
  SalesDispatchOverviewSchema,
  UpdateDispatchDriverSchema,
  UpdateDispatchDueDateSchema,
  UpdateDispatchStatusSchema,
  UpdateSalesDeliveryOptionSchema,
  BulkAssignDriverSchema,
  BulkCancelDispatchSchema,
  ExportDispatchesSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { QtyControlType } from "@api/type";
import type { Prisma } from "@gnd/db";
import type { SalesDispatchStatus } from "@gnd/utils/constants";
import {
  isControlOverviewReadV2Enabled,
  isControlReadV2Enabled,
  projectDispatchListControl,
  projectSalesListControl,
  withDispatchControl,
  withDispatchListControl,
  withSalesControl,
  withSalesListControl,
} from "@gnd/sales";
import { NotificationService } from "@notifications/services/triggers";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { hasQty } from "@gnd/utils/sales";

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

function isControlDebugEnabled() {
  return ["1", "true", "yes", "on"].includes(
    String(process.env.CONTROL_DEBUG || "")
      .trim()
      .toLowerCase(),
  );
}

function controlDebugLog(label: string, payload: Record<string, unknown>) {
  if (!isControlDebugEnabled()) return;
}

function emptyQtyStat() {
  return {
    lhQty: 0,
    rhQty: 0,
    qty: 0,
    total: 0,
  };
}

function normalizeShippingAddress(
  address:
    | {
        meta?: unknown;
        [key: string]: unknown;
      }
    | null
    | undefined,
) {
  const base = (address || {}) as Record<string, unknown>;
  const rawMeta =
    base.meta && typeof base.meta === "object" && !Array.isArray(base.meta)
      ? (base.meta as Record<string, unknown>)
      : {};
  return {
    ...base,
    meta: {
      ...rawMeta,
      placeId: rawMeta.placeId ?? null,
      lat: rawMeta.lat ?? null,
      lng: rawMeta.lng ?? null,
    },
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

const DISPATCH_OVERVIEW_ORDER_CONTROL_FIELDS = [
  "dispatchStatus",
  "packed",
  "pendingPacking",
] as const;

const DISPATCH_OVERVIEW_DISPATCH_CONTROL_FIELDS = [
  "dispatchStatus",
  "packables",
  "pendingPacking",
  "packed",
  "dispatchAssigned",
  "dispatchInProgress",
  "dispatchCompleted",
] as const;

async function requireSuperAdmin(ctx: TRPCContext) {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }
  const user = await ctx.db.users.findFirst({
    where: {
      id: ctx.userId,
    },
    select: {
      roles: {
        where: {
          deletedAt: null,
        },
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  const role = user?.roles?.[0]?.role?.name;
  if (role?.toLowerCase() !== "super admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Super Admin can run dispatch sweeper.",
    });
  }
}

function dispatchKeepScore(dispatch: {
  status: string | null;
  packedItemCount: number;
  itemCount: number;
  updatedAt: Date | null;
  createdAt: Date | null;
}) {
  const statusRank =
    dispatch.status === "completed"
      ? 4
      : dispatch.status === "in progress"
        ? 3
        : dispatch.status === "packed"
          ? 2
          : dispatch.status === "queue"
            ? 1
            : dispatch.status === "missing items"
              ? 0
              : 0;
  return (
    statusRank * 1_000_000 +
    Math.min(999_999, dispatch.packedItemCount * 10_000 + dispatch.itemCount)
  );
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
              meta: true,
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
    [
      ...new Map(
        data.map((row) => [row.order.id, { id: row.order.id }]),
      ).values(),
    ],
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
        const control = (a as any).control || null;
        const effectiveStatus = control?.dispatchStatus || (rest as any).status;
        return {
          ...rest,
          status: effectiveStatus,
          order: {
            ...rest.order,
            shippingAddress: normalizeShippingAddress(
              (rest.order as any)?.shippingAddress,
            ),
            control: orderControlById.get(rest.order.id) || null,
          },
          statistic: toLegacyDispatchStatistic(control),
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
    rowsWithStatistic.map((a) => {
      const effectiveStatus =
        (a as any)?.statistic?.dispatchStatus || (a as any)?.status;
      return {
        ...a,
        status: effectiveStatus,
        order: {
          ...(a as any).order,
          shippingAddress: normalizeShippingAddress(
            (a as any)?.order?.shippingAddress,
          ),
          control: orderControlById.get((a as any).order?.id) || null,
        },
        uid: String(a.id),
      };
    }),
  );
}

export async function findDuplicateDispatchGroups(ctx: TRPCContext) {
  await requireSuperAdmin(ctx);

  const dispatches = await ctx.db.orderDelivery.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [{ salesOrderId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      salesOrderId: true,
      status: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      deliveryMode: true,
      driverId: true,
      driver: {
        select: {
          id: true,
          name: true,
        },
      },
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

  const bySalesId = new Map<number, typeof dispatches>();
  for (const dispatch of dispatches) {
    const stack = bySalesId.get(dispatch.salesOrderId) || [];
    stack.push(dispatch);
    bySalesId.set(dispatch.salesOrderId, stack);
  }

  const groups = [...bySalesId.entries()]
    .filter(([, groupDispatches]) => groupDispatches.length > 1)
    .map(([salesId, groupDispatches]) => {
      const hydratedDispatches = groupDispatches.map((dispatch) => {
        const itemCount = dispatch.items.length;
        const packedItemCount = dispatch.items.filter(
          (item) => item.packingStatus === "packed",
        ).length;
        return {
          id: dispatch.id,
          status: dispatch.status,
          dueDate: dispatch.dueDate,
          createdAt: dispatch.createdAt,
          updatedAt: dispatch.updatedAt,
          deliveryMode: dispatch.deliveryMode,
          driverId: dispatch.driverId,
          driverName: dispatch.driver?.name || null,
          itemCount,
          packedItemCount,
          hasPacking: itemCount > 0,
        };
      });

      const recommended = hydratedDispatches.slice().sort((a, b) => {
        const scoreDiff = dispatchKeepScore(b) - dispatchKeepScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        const updatedDiff =
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime();
        if (updatedDiff !== 0) return updatedDiff;
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      })[0];

      return {
        salesId,
        orderNo: groupDispatches[0]?.order?.orderId || null,
        duplicateCount: hydratedDispatches.length,
        recommendedKeepDispatchId: recommended?.id || hydratedDispatches[0]?.id,
        dispatches: hydratedDispatches,
      };
    })
    .sort((a, b) => b.duplicateCount - a.duplicateCount);

  return {
    groups,
    summary: {
      duplicateSalesCount: groups.length,
      duplicateDispatchCount: groups.reduce(
        (total, group) => total + group.duplicateCount,
        0,
      ),
    },
  };
}

export async function resolveDuplicateDispatchGroup(
  ctx: TRPCContext,
  input: ResolveDuplicateDispatchGroupSchema,
) {
  await requireSuperAdmin(ctx);

  const deleteDispatchIds = [...new Set(input.deleteDispatchIds || [])].filter(
    Boolean,
  );
  if (!deleteDispatchIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No duplicate dispatch selected for deletion.",
    });
  }
  if (deleteDispatchIds.includes(input.keepDispatchId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Keep dispatch cannot be part of delete set.",
    });
  }

  const now = new Date();
  const result = await ctx.db.$transaction(async (tx) => {
    const activeDispatches = await tx.orderDelivery.findMany({
      where: {
        salesOrderId: input.salesId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (activeDispatches.length <= 1) {
      return {
        salesId: input.salesId,
        keepDispatchId: input.keepDispatchId,
        deletedDispatchIds: [] as number[],
        alreadyClean: true,
      };
    }

    const activeIds = new Set(activeDispatches.map((dispatch) => dispatch.id));
    if (!activeIds.has(input.keepDispatchId)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Selected keep dispatch is stale or no longer active.",
      });
    }

    const validDeleteIds = deleteDispatchIds.filter((id) => activeIds.has(id));
    if (!validDeleteIds.length) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Selected duplicate dispatches are stale or already resolved.",
      });
    }

    await tx.orderDelivery.updateMany({
      where: {
        salesOrderId: input.salesId,
        id: {
          in: validDeleteIds,
        },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
      },
    });

    return {
      salesId: input.salesId,
      keepDispatchId: input.keepDispatchId,
      deletedDispatchIds: validDeleteIds,
      alreadyClean: false,
    };
  });

  return {
    ok: true,
    ...result,
  };
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
  | "sales_dispatch_cancelled"
  | "sales_dispatch_trip_canceled";

function mapStatusToNotificationChannel(
  status: DispatchStatusSchema,
): DispatchStatusNotificationChannel {
  switch (status) {
    case "queue":
      return "sales_dispatch_queued";
    case "packed":
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
  db: TRPCContext["db"],
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

  const notification = new NotificationService(tasks, {
    db,
    userId: authorId,
  }).setEmployeeRecipients(recipientId);

  await notification.send(
    channel as any,
    {
      author: {
        id: authorId,
        role: "employee",
      },
      payload: {
        orderNo: payload.orderNo || undefined,
        dispatchId: payload.dispatchId,
        deliveryMode: payload.deliveryMode || undefined,
        dueDate: payload.dueDate || undefined,
        driverId: payload.driverId || undefined,
      },
    } as any,
  );
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
      driver: newDriverId
        ? { connect: { id: newDriverId } }
        : { disconnect: true },
    },
  });

  await sendDispatchNotification(
    ctx.db,
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
    ctx.db,
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
    ctx.db,
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

  let channel = mapStatusToNotificationChannel(newStatus);
  if (newStatus === "cancelled" && oldStatus === "in progress") {
    channel = "sales_dispatch_trip_canceled";
  }
  await sendDispatchNotification(
    ctx.db,
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
    completionMode: (input.completionMode ??
      null) as CompletionModeSchema | null,
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
  const address = normalizeShippingAddress(result.order.shippingAddress as any);
  const order = result.order;
  const controlReadV2Enabled = isControlOverviewReadV2Enabled();

  const orderRows = [{ id: order.id }];
  let orderControl: any = null;
  if (controlReadV2Enabled) {
    const orderWithControl = await withSalesListControl(
      orderRows,
      ctx.db as any,
      [...DISPATCH_OVERVIEW_ORDER_CONTROL_FIELDS] as any,
    );
    orderControl = (orderWithControl?.[0] as any)?.control || null;
  } else {
    const orderWithStatistic = await withSalesControl(orderRows, ctx.db as any);
    const statistic = (orderWithStatistic?.[0] as any)?.statistic;
    if (statistic) {
      orderControl = projectSalesListControl(statistic, [
        ...DISPATCH_OVERVIEW_ORDER_CONTROL_FIELDS,
      ] as any);
    }
  }

  let dispatchControl: any = null;
  if (dispatch?.id) {
    const dispatchRows = [{ id: dispatch.id, salesOrderId: order.id }];
    if (controlReadV2Enabled) {
      const rows = await withDispatchListControl(
        dispatchRows,
        ctx.db as any,
        [...DISPATCH_OVERVIEW_DISPATCH_CONTROL_FIELDS] as any,
      );
      dispatchControl = (rows?.[0] as any)?.control || null;
    } else {
      const rows = await withDispatchControl(dispatchRows, ctx.db as any);
      const statistic = (rows?.[0] as any)?.statistic;
      if (statistic) {
        dispatchControl = projectDispatchListControl(statistic, [
          ...DISPATCH_OVERVIEW_DISPATCH_CONTROL_FIELDS,
        ] as any);
      }
    }
  }

  if (dispatch?.id && controlReadV2Enabled && isControlReadParityEnabled()) {
    const dispatchRows = [{ id: dispatch.id, salesOrderId: order.id }];
    const [legacyOrderRows, legacyDispatchRows] = await Promise.all([
      withSalesControl(orderRows, ctx.db as any),
      withDispatchControl(dispatchRows, ctx.db as any),
    ]);
    const legacyOrderStatistic = (legacyOrderRows?.[0] as any)?.statistic;
    const legacyDispatchStatistic = (legacyDispatchRows?.[0] as any)?.statistic;
    const legacyOrderControl = legacyOrderStatistic
      ? projectSalesListControl(legacyOrderStatistic, [
          ...DISPATCH_OVERVIEW_ORDER_CONTROL_FIELDS,
        ] as any)
      : null;
    const legacyDispatchControl = legacyDispatchStatistic
      ? projectDispatchListControl(legacyDispatchStatistic, [
          ...DISPATCH_OVERVIEW_DISPATCH_CONTROL_FIELDS,
        ] as any)
      : null;

    const hasMismatch =
      legacyOrderControl?.dispatchStatus !== orderControl?.dispatchStatus ||
      Number(legacyOrderControl?.packed?.total || 0) !==
        Number(orderControl?.packed?.total || 0) ||
      Number(legacyOrderControl?.pendingPacking?.total || 0) !==
        Number(orderControl?.pendingPacking?.total || 0) ||
      legacyDispatchControl?.dispatchStatus !==
        dispatchControl?.dispatchStatus ||
      Number(legacyDispatchControl?.packed?.total || 0) !==
        Number(dispatchControl?.packed?.total || 0) ||
      Number(legacyDispatchControl?.pendingPacking?.total || 0) !==
        Number(dispatchControl?.pendingPacking?.total || 0);

    if (hasMismatch) {
      console.warn("[control-read-parity][dispatch-overview] mismatches", {
        mismatchCount: 1,
        orderId: order.id,
        orderIds: [order.id],
        dispatchId: dispatch.id,
        dispatchIds: [dispatch.id],
      });
    }
  }

  return {
    dispatch: dispatch
      ? {
          ...dispatch,
          control: dispatchControl,
        }
      : dispatch,
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
    address,
    // scheduleDate: dispatch?.dueDate,
    order: {
      orderId: order.orderId,
      date: order.createdAt,
      id: order.id,
      control: (orderControl as any) || null,
      customer: order.customer
        ? {
            name: order.customer.name,
            businessName: order.customer.businessName,
            phoneNo: order.customer.phoneNo,
            email: order.customer.email,
            address: order.customer.address,
          }
        : null,
    },
    // orderRequiresUpdate: result.orderRequiresUpdate,
  };
}

function toQtyMatrix(qty?: {
  qty?: number | null;
  lh?: number | null;
  rh?: number | null;
  noHandle?: boolean | null;
}) {
  const q = Number(qty?.qty || 0);
  const lh = Number(qty?.lh || 0);
  const rh = Number(qty?.rh || 0);
  const noHandle = qty?.noHandle === true ? true : lh <= 0 && rh <= 0;
  return {
    qty: q,
    lh,
    rh,
    noHandle,
  };
}

function qtyTotal(qty?: {
  qty?: number | null;
  lh?: number | null;
  rh?: number | null;
}) {
  const q = Number(qty?.qty || 0);
  const lh = Number(qty?.lh || 0);
  const rh = Number(qty?.rh || 0);
  return q > 0 ? q : lh + rh;
}

function detectDispatchReadiness(
  dispatchItems: Array<{
    uid: string;
    title: string;
    shippable?: boolean | null;
    itemConfig?: { production?: boolean | null } | null;
    totalQty?: { qty?: number | null; lh?: number | null; rh?: number | null };
    packedQty?: { qty?: number | null; lh?: number | null; rh?: number | null };
    availableQty?: {
      qty?: number | null;
      lh?: number | null;
      rh?: number | null;
    };
    deliverableQty?: {
      qty?: number | null;
      lh?: number | null;
      rh?: number | null;
    };
    nonDeliverableQty?: {
      qty?: number | null;
      lh?: number | null;
      rh?: number | null;
    };
  }>,
) {
  const unresolvedNonProduceables = dispatchItems
    .filter((item) => {
      if (item.shippable === false) return false;
      if (item.itemConfig?.production !== false) return false;
      const pendingQty = Math.max(
        0,
        qtyTotal(item.totalQty) - qtyTotal(item.packedQty),
      );
      if (pendingQty <= 0) return false;

      const hasAvailable = qtyTotal(item.availableQty) > 0;
      const hasDeliverables = qtyTotal(item.deliverableQty) > 0;
      const hasNonDeliverable = qtyTotal(item.nonDeliverableQty) > 0;

      // For non-production shippable items, lack of both deliverables and
      // available quantities with pending qty means generation has not run.
      return !hasAvailable && !hasDeliverables && hasNonDeliverable;
    })
    .map((item) => ({
      uid: item.uid,
      title: item.title,
      pendingQty: Math.max(
        0,
        qtyTotal(item.totalQty) - qtyTotal(item.packedQty),
      ),
      missingQty: qtyTotal(item.nonDeliverableQty),
    }));

  return {
    canDispatch: unresolvedNonProduceables.length === 0,
    state:
      unresolvedNonProduceables.length > 0
        ? ("cant dispatch" as const)
        : ("ready" as const),
    reason:
      unresolvedNonProduceables.length > 0
        ? "Non-produceable items are missing auto-generated assignment/submission flow."
        : "Ready for dispatch.",
    unresolvedNonProduceables,
  };
}

export async function getDispatchOverviewV2(
  ctx: TRPCContext,
  query: SalesDispatchOverviewSchema,
) {
  const result = await getSalesDispatchOverview(ctx.db, {
    salesId: query.salesId,
    salesNo: query.salesNo,
  });

  const dispatch = result.deliveries.find((d) => d.id === query.dispatchId);
  const order = result.order;
  const address = normalizeShippingAddress(order.shippingAddress as any);

  const dispatchItems = result.order.itemControls.map((item) => {
    const dispatchable = result.dispatchables.find((d) => d.uid === item.uid);
    const listedItems = dispatch?.items.filter(
      (a) => a.item?.controlUid === item.uid,
    );
    const packedItems = listedItems?.filter(
      (a) => !("packingStatus" in a) || a.packingStatus === "packed",
    );
    const totalListedAllDispatches = recomposeQty(
      qtyMatrixSum(
        ...result.deliveries
          .filter((d) => d.status !== "cancelled")
          .map((d) =>
            d.items
              .filter((i) => i.item.controlUid === item.uid)
              .map(transformQtyHandle)
              .flat(),
          )
          .flat(),
      ),
    );
    const listedQty = recomposeQty(
      qtyMatrixSum(...((listedItems || []).map(transformQtyHandle) as any)),
    );
    const packedQty = recomposeQty(
      qtyMatrixSum(...((packedItems || []).map(transformQtyHandle) as any)),
    );
    const availableQty = recomposeQty(dispatchable?.availableQty as any);
    const deliverableQty = recomposeQty(
      qtyMatrixSum(...(dispatchable?.deliverables?.map((a) => a.qty) || [])),
    );
    const nonDeliverableQty = recomposeQty(
      qtyMatrixDifference(
        dispatchable?.totalQty!,
        qtyMatrixSum(availableQty, totalListedAllDispatches),
      ),
    );

    let packingHistory = listedItems?.map((a) => ({
      qty: toQtyMatrix(transformQtyHandle(a)),
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
            packingHistory?.findIndex((a) => a.packingUid === p.packingUid) ===
              o),
      )
      .map((d) => ({
        ...d,
        qty: toQtyMatrix(
          !d.packingUid
            ? d.qty
            : qtyMatrixSum(
                ...packingHistory?.filter(
                  (p) => p.packingUid === d.packingUid,
                )!,
              ),
        ),
      }));

    // Merge available deliverables with currently-listed dispatch quantities so
    // replaceExisting re-pack can re-allocate the same submission quantities.
    const deliverableBySubmission = new Map<number, any>();
    (dispatchable?.deliverables || []).forEach((entry) => {
      if (!entry?.submissionId) return;
      deliverableBySubmission.set(
        entry.submissionId,
        recomposeQty(entry.qty as any),
      );
    });
    // Some rows (especially older or non-production flows) expose submission
    // quantities via dispatchStat instead of deliverables. Use that as fallback
    // so replaceExisting pack edits can still allocate correctly.
    (dispatchable as any)?.dispatchStat?.forEach((entry: any) => {
      const submissionId = Number(entry?.submissionId || 0);
      if (!submissionId) return;
      const existing = recomposeQty(
        (deliverableBySubmission.get(submissionId) || {}) as any,
      );
      if (hasQty(existing)) return;
      const available = recomposeQty(entry?.available as any);
      const submitted = recomposeQty(entry?.submitted as any);
      const delivered = recomposeQty(entry?.delivered as any);
      const fallbackQty = hasQty(available)
        ? available
        : hasQty(submitted)
          ? submitted
          : delivered;
      if (!hasQty(fallbackQty)) return;
      deliverableBySubmission.set(
        submissionId,
        recomposeQty(fallbackQty as any),
      );
    });
    (listedItems || []).forEach((entry) => {
      const submissionId = Number(
        (entry as any)?.orderProductionSubmissionId || 0,
      );
      if (!submissionId) return;
      const listedSubmissionQty = recomposeQty(
        transformQtyHandle(entry) as any,
      );
      const existing = recomposeQty(
        (deliverableBySubmission.get(submissionId) || {}) as any,
      );
      deliverableBySubmission.set(
        submissionId,
        recomposeQty(qtyMatrixSum(existing as any, listedSubmissionQty as any)),
      );
    });

    return {
      uid: item.uid,
      title: item.title,
      subtitle: dispatchable?.subtitle || item.sectionTitle || "",
      sectionTitle: item.sectionTitle || "",
      img: dispatchable?.img || null,
      dispatchable: true,
      itemConfig: (dispatchable as any)?.itemConfig || null,
      shippable: (dispatchable as any)?.itemConfig?.shipping !== false,
      salesItemId: dispatchable?.itemId || null,
      totalQty: toQtyMatrix(dispatchable?.totalQty as any),
      availableQty: toQtyMatrix(availableQty as any),
      deliverableQty: toQtyMatrix(deliverableQty as any),
      listedQty: toQtyMatrix(listedQty as any),
      packedQty: toQtyMatrix(packedQty as any),
      nonDeliverableQty: toQtyMatrix(nonDeliverableQty as any),
      deliverables: Array.from(deliverableBySubmission.entries()).map(
        ([submissionId, qty]) => ({
          submissionId,
          qty: toQtyMatrix(qty as any),
        }),
      ),
      packingHistory,
    };
  });

  controlDebugLog("getDispatchOverviewV2.dispatchItems", {
    salesId: order.id,
    dispatchId: query.dispatchId,
    itemCount: dispatchItems.length,
    rows: dispatchItems.map((item) => ({
      uid: item.uid,
      salesItemId: item.salesItemId,
      shippable: item.shippable,
      itemConfig: item.itemConfig,
      totalQty: item.totalQty,
      availableQty: item.availableQty,
      deliverableQty: item.deliverableQty,
      listedQty: item.listedQty,
      packedQty: item.packedQty,
      nonDeliverableQty: item.nonDeliverableQty,
      packingHistoryCount: item.packingHistory.length,
      deliverablesCount: item.deliverables.length,
    })),
  });

  const summary = dispatchItems.reduce(
    (acc, item) => {
      acc.total += qtyTotal(item.totalQty);
      acc.deliverable += qtyTotal(item.deliverableQty);
      acc.listed += qtyTotal(item.listedQty);
      acc.packed += qtyTotal(item.packedQty);
      acc.pending += qtyTotal(item.nonDeliverableQty);
      acc.available += qtyTotal(item.availableQty);
      return acc;
    },
    {
      total: 0,
      deliverable: 0,
      listed: 0,
      packed: 0,
      pending: 0,
      available: 0,
    },
  );

  controlDebugLog("getDispatchOverviewV2.summary", {
    salesId: order.id,
    dispatchId: query.dispatchId,
    summary,
    dispatchStatus: dispatch?.status ?? null,
  });

  const duplicateDispatches = result.deliveries.map((delivery) => {
    const listedQty = recomposeQty(
      qtyMatrixSum(...((delivery.items || []).map(transformQtyHandle) as any)),
    );
    const packedQty = recomposeQty(
      qtyMatrixSum(
        ...((delivery.items || [])
          .filter((item) => item.packingStatus === "packed")
          .map(transformQtyHandle) as any),
      ),
    );
    const pendingPackingQty = recomposeQty(
      qtyMatrixDifference(listedQty, packedQty),
    );
    const itemCount = (delivery.items || []).length;
    const packedItemCount = (delivery.items || []).filter(
      (item) => item.packingStatus === "packed",
    ).length;

    return {
      id: delivery.id,
      dispatchNumber: delivery.dispatchNumber,
      status: delivery.status || null,
      dueDate: delivery.dueDate,
      createdAt: delivery.createdAt,
      updatedAt: (delivery as any).updatedAt || null,
      driverName: delivery.driver?.name || null,
      itemCount,
      packedItemCount,
      listedQty: toQtyMatrix(listedQty as any),
      packedQty: toQtyMatrix(packedQty as any),
      pendingPackingQty: toQtyMatrix(pendingPackingQty as any),
      listedTotal: qtyTotal(listedQty as any),
      packedTotal: qtyTotal(packedQty as any),
      pendingPackingTotal: qtyTotal(pendingPackingQty as any),
      isCurrent: delivery.id === dispatch?.id,
    };
  });

  const recommendedDuplicateKeep = duplicateDispatches.slice().sort((a, b) => {
    const scoreDiff = dispatchKeepScore(b) - dispatchKeepScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    const updatedDiff =
      new Date(b.updatedAt || 0).getTime() -
      new Date(a.updatedAt || 0).getTime();
    if (updatedDiff !== 0) return updatedDiff;
    return (
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
    );
  })[0];

  const duplicateInsight = {
    salesId: order.id,
    currentDispatchId: dispatch?.id || null,
    isDuplicate: duplicateDispatches.length > 1,
    recommendedKeepDispatchId:
      recommendedDuplicateKeep?.id || dispatch?.id || null,
    dispatches: duplicateDispatches,
  };

  controlDebugLog("getDispatchOverviewV2.duplicateInsight", {
    salesId: order.id,
    dispatchId: query.dispatchId,
    duplicateCount: duplicateDispatches.length,
    recommendedKeepDispatchId: duplicateInsight.recommendedKeepDispatchId,
    dispatches: duplicateDispatches.map((item) => ({
      id: item.id,
      status: item.status,
      listedTotal: item.listedTotal,
      packedTotal: item.packedTotal,
      pendingPackingTotal: item.pendingPackingTotal,
      itemCount: item.itemCount,
      packedItemCount: item.packedItemCount,
      isCurrent: item.isCurrent,
    })),
  });

  const dispatchReadiness = detectDispatchReadiness(dispatchItems as any);

  controlDebugLog("getDispatchOverviewV2.dispatchReadiness", {
    salesId: order.id,
    dispatchId: query.dispatchId,
    state: dispatchReadiness.state,
    canDispatch: dispatchReadiness.canDispatch,
    unresolvedCount: dispatchReadiness.unresolvedNonProduceables.length,
    unresolvedItems: dispatchReadiness.unresolvedNonProduceables.map(
      (item) => ({
        uid: item.uid,
        title: item.title,
        pendingQty: item.pendingQty,
        missingQty: item.missingQty,
      }),
    ),
  });

  return {
    dispatch: dispatch
      ? {
          id: dispatch.id,
          status: dispatch.status,
          deliveryMode: dispatch.deliveryMode,
          dispatchNumber: dispatch.dispatchNumber,
          dueDate: dispatch.dueDate,
          createdAt: dispatch.createdAt,
          driver: dispatch.driver
            ? {
                id: dispatch.driver.id,
                name: dispatch.driver.name,
              }
            : null,
        }
      : null,
    order: {
      id: order.id,
      orderId: order.orderId,
      date: order.createdAt,
      customer: order.customer
        ? {
            name: order.customer.name,
            businessName: order.customer.businessName,
            phoneNo: order.customer.phoneNo,
            email: order.customer.email,
            address: order.customer.address,
          }
        : null,
    },
    address,
    summary,
    dispatchItems,
    duplicateInsight,
    dispatchReadiness,
  };
}

export async function enlistItemToForDispatch(ctx: TRPCContext) {
  //
}

export async function getDispatchSummary(ctx: TRPCContext) {
  const { db } = ctx;

  const [statusCounts, driverWorkload, overdueCount] = await Promise.all([
    db.orderDelivery.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    db.orderDelivery.groupBy({
      by: ["driverId"],
      where: {
        deletedAt: null,
        driverId: { not: null },
        status: { in: ["queue", "in progress", "packed"] },
      },
      _count: { id: true },
    }),
    db.orderDelivery.count({
      where: {
        deletedAt: null,
        status: { in: ["queue", "in progress", "packed"] },
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  const driverIds = driverWorkload
    .map((d) => d.driverId)
    .filter((id): id is number => id != null);

  const drivers =
    driverIds.length > 0
      ? await db.users.findMany({
          where: { id: { in: driverIds } },
          select: { id: true, name: true },
        })
      : [];

  const driverMap = Object.fromEntries(drivers.map((d) => [d.id, d.name]));

  const byStatus = Object.fromEntries(
    statusCounts.map((row) => [row.status ?? "unknown", row._count.id]),
  );

  const total = statusCounts.reduce((sum, row) => sum + row._count.id, 0);
  const pending =
    (byStatus["queue"] ?? 0) +
    (byStatus["in progress"] ?? 0) +
    (byStatus["packed"] ?? 0) +
    (byStatus["missing items"] ?? 0);

  return {
    total,
    pending,
    byStatus: {
      queue: byStatus["queue"] ?? 0,
      inProgress: byStatus["in progress"] ?? 0,
      packed: byStatus["packed"] ?? 0,
      completed: byStatus["completed"] ?? 0,
      cancelled: byStatus["cancelled"] ?? 0,
      missingItems: byStatus["missing items"] ?? 0,
    },
    overdue: overdueCount,
    driverWorkload: driverWorkload.map((row) => ({
      driverId: row.driverId!,
      driverName: driverMap[row.driverId!] ?? "Unknown",
      activeDispatches: row._count.id,
    })),
  };
}

export async function bulkAssignDispatchDriver(
  ctx: TRPCContext,
  input: BulkAssignDriverSchema,
) {
  const { db } = ctx;
  const now = new Date();
  await db.orderDelivery.updateMany({
    where: {
      id: { in: input.dispatchIds },
      deletedAt: null,
    },
    data: {
      driverId: input.newDriverId,
      updatedAt: now,
    },
  });
  return { ok: true, updated: input.dispatchIds.length };
}

export async function bulkCancelDispatches(
  ctx: TRPCContext,
  input: BulkCancelDispatchSchema,
) {
  const { db } = ctx;
  const now = new Date();
  await db.orderDelivery.updateMany({
    where: {
      id: { in: input.dispatchIds },
      deletedAt: null,
      status: { notIn: ["completed", "cancelled"] },
    },
    data: {
      status: "cancelled",
      updatedAt: now,
    },
  });
  return { ok: true, cancelled: input.dispatchIds.length };
}

export async function exportDispatches(
  ctx: TRPCContext,
  input: ExportDispatchesSchema,
) {
  const { db } = ctx;
  const where = whereDispatch(input as any);
  const data = await db.orderDelivery.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 5000,
    select: {
      id: true,
      status: true,
      createdAt: true,
      dueDate: true,
      deliveryMode: true,
      order: {
        select: {
          orderId: true,
          customer: {
            select: { name: true, businessName: true, phoneNo: true },
          },
          shippingAddress: {
            select: { address1: true, city: true, state: true },
          },
        },
      },
      driver: { select: { id: true, name: true } },
    },
  });
  return data.map((row) => ({
    id: row.id,
    orderNo: row.order?.orderId ?? "",
    status: row.status,
    dueDate: row.dueDate?.toISOString() ?? "",
    deliveryMode: row.deliveryMode,
    driver: row.driver?.name ?? "Unassigned",
    customer:
      row.order?.customer?.businessName || row.order?.customer?.name || "",
    phone: row.order?.customer?.phoneNo ?? "",
    address: [
      row.order?.shippingAddress?.address1,
      row.order?.shippingAddress?.city,
      row.order?.shippingAddress?.state,
    ]
      .filter(Boolean)
      .join(", "),
    createdAt: row.createdAt?.toISOString() ?? "",
  }));
}

export async function getDeletedDispatches(ctx: TRPCContext) {
  const { db } = ctx;
  return db.orderDelivery.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 200,
    select: {
      id: true,
      status: true,
      deletedAt: true,
      dueDate: true,
      deliveryMode: true,
      order: {
        select: {
          orderId: true,
          customer: { select: { name: true, businessName: true } },
        },
      },
      driver: { select: { id: true, name: true } },
    },
  });
}

export async function restoreDispatch(ctx: TRPCContext, dispatchId: number) {
  const { db } = ctx;
  const dispatch = await db.orderDelivery.findUnique({
    where: { id: dispatchId },
    select: { id: true, deletedAt: true },
  });
  if (!dispatch)
    throw new TRPCError({ code: "NOT_FOUND", message: "Dispatch not found" });
  if (!dispatch.deletedAt)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Dispatch is not deleted",
    });

  await db.orderDelivery.update({
    where: { id: dispatchId },
    data: { deletedAt: null, status: "queue" },
  });
  return { ok: true, dispatchId };
}
