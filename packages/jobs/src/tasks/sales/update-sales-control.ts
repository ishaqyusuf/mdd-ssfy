import { userHasPermission } from "@gnd/auth/utils";
import { type Db, db } from "@gnd/db";
import {
  type LegacyUpdateSalesControlAction,
  type UpdateSalesControl,
  assertSpecialOrderOperationAllowed,
  authorizeSalesControlTaskInput,
  cancelDispatchTask,
  clearPackingTask,
  createAssignmentsTask,
  deleteAssignmentsTasks,
  deleteSubmissionsTask,
  isControlWriteV2Enabled,
  markAsCompletedTask,
  packDispatchItemTask,
  resolveLegacyUpdateSalesControlAction,
  salesControlTaskPermissionKeys,
  shouldSyncInventoryProductionLifecycleForSalesControl,
  startDispatchTask,
  submitAllTask,
  submitDispatchTask,
  syncInventoryProductionLifecycleForSale,
  updateSalesControlSchema,
  updateSubmissionsTask,
} from "@gnd/sales";
import { Notifications } from "@gnd/notifications";
import type { NotificationJobInput } from "@notifications/schemas";
import { NotificationService } from "@notifications/services/triggers";
import { logger, schemaTask, tasks } from "@trigger.dev/sdk/v3";
import type { TaskName } from "../../schema";

type SalesControlActionHandler = (
  db: Db,
  input: UpdateSalesControl,
) => Promise<unknown>;

const actionMaps: Record<
  LegacyUpdateSalesControlAction,
  SalesControlActionHandler
> = {
  submitAll: submitAllTask,
  packItems: packDispatchItemTask,
  clearPackings: clearPackingTask,
  cancelDispatch: cancelDispatchTask,
  startDispatch: startDispatchTask,
  submitDispatch: submitDispatchTask,
  createAssignments: createAssignmentsTask,
  updateSubmissions: updateSubmissionsTask,
  deleteSubmissions: deleteSubmissionsTask,
  deleteAssignments: deleteAssignmentsTasks,
  markAsCompleted: markAsCompletedTask,
};

function resolveLegacyActionCompat(
  input: UpdateSalesControl,
): LegacyUpdateSalesControlAction | null {
  const orderedActions: LegacyUpdateSalesControlAction[] = [
    "submitAll",
    "packItems",
    "clearPackings",
    "cancelDispatch",
    "startDispatch",
    "submitDispatch",
    "createAssignments",
    "updateSubmissions",
    "deleteSubmissions",
    "deleteAssignments",
    "markAsCompleted",
  ];
  for (const action of orderedActions) {
    if (input[action]) return action;
  }
  return null;
}

function resolveActionHandler(input: UpdateSalesControl) {
  if (isControlWriteV2Enabled()) {
    const mapping = resolveLegacyUpdateSalesControlAction(input);

    return mapping ? actionMaps[mapping.action] : null;
  }
  const legacyAction = resolveLegacyActionCompat(input);
  return legacyAction ? actionMaps[legacyAction] : null;
}

async function enforceSpecialOrderForAction(input: UpdateSalesControl) {
  const common = {
    salesOrderId: input.meta.salesId,
    actorUserId: input.meta.authorId,
    authorName: input.meta.authorName,
    source: "jobs.update-sales-control",
  };
  if (input.createAssignments || input.submitAll || input.markAsCompleted) {
    await assertSpecialOrderOperationAllowed(db, {
      ...common,
      operation: "PRODUCTION",
    });
  }
  if (input.packItems || input.markAsCompleted) {
    await assertSpecialOrderOperationAllowed(db, {
      ...common,
      operation: "PACKING",
    });
  }
  if (input.startDispatch || input.submitDispatch) {
    await assertSpecialOrderOperationAllowed(db, {
      ...common,
      operation: "DISPATCH",
    });
  }
}

async function authorizeTaskInput(input: UpdateSalesControl) {
  const permissionEntries = await Promise.all(
    salesControlTaskPermissionKeys.map(
      async (permission) =>
        [
          permission,
          await userHasPermission(db, input.meta.authorId, permission),
        ] as const,
    ),
  );
  return authorizeSalesControlTaskInput(db, input, {
    userId: input.meta.authorId,
    can: Object.fromEntries(permissionEntries),
  });
}

async function sendDispatchPackedNotification(input: UpdateSalesControl) {
  if (!input.packItems?.dispatchId) return;
  const dispatchStatus = String(input.packItems.dispatchStatus || "");
  if (dispatchStatus === "completed" || dispatchStatus === "cancelled") return;

  const dispatch = await db.orderDelivery.findFirst({
    where: {
      id: input.packItems.dispatchId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      dueDate: true,
      deliveryMode: true,
      driverId: true,
      order: {
        select: {
          orderId: true,
        },
      },
    },
  });
  if (!dispatch) return;
  if (dispatch.status !== "packed") return;
  const notification = new NotificationService(tasks, {
    db,
    userId: input.meta.authorId,
  });
  await notification.send("sales_dispatch_packed", {
    author: {
      id: input.meta.authorId,
      role: "employee",
    },
    payload: {
      orderNo: dispatch.order?.orderId || undefined,
      dispatchId: dispatch.id,
      deliveryMode: dispatch.deliveryMode || undefined,
      dueDate: dispatch.dueDate || undefined,
      driverId: dispatch.driverId || undefined,
    },
  } as any);
}

async function sendDispatchLifecycleNotification(input: UpdateSalesControl) {
  const dispatchIds = input.startDispatch?.dispatchId
    ? [input.startDispatch.dispatchId]
    : input.cancelDispatch?.dispatchIds?.length
      ? input.cancelDispatch.dispatchIds
      : input.cancelDispatch?.dispatchId
        ? [input.cancelDispatch.dispatchId]
        : [];
  if (!dispatchIds.length) return;

  const dispatches = await db.orderDelivery.findMany({
    where: {
      id: {
        in: dispatchIds,
      },
      salesOrderId: input.meta.salesId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      dueDate: true,
      deliveryMode: true,
      driverId: true,
      order: {
        select: {
          orderId: true,
        },
      },
    },
  });

  const isStart = Boolean(input.startDispatch?.dispatchId);
  const isCancel = Boolean(
    input.cancelDispatch?.dispatchIds?.length ||
    input.cancelDispatch?.dispatchId,
  );
  const notification = new NotificationService(tasks, {
    db,
    userId: input.meta.authorId,
  });
  for (const dispatch of dispatches) {
    if (isStart && dispatch.status !== "in progress") continue;
    if (isCancel && dispatch.status !== "cancelled") continue;
    try {
      await notification.send(
        isStart ? "sales_dispatch_in_progress" : "sales_dispatch_trip_canceled",
        {
          author: {
            id: input.meta.authorId,
            role: "employee",
          },
          payload: {
            orderNo: dispatch.order?.orderId || undefined,
            dispatchId: dispatch.id,
            deliveryMode: dispatch.deliveryMode || undefined,
            dueDate: dispatch.dueDate || undefined,
            driverId: dispatch.driverId || undefined,
          },
        } as any,
      );
    } catch (error) {
      logger.error("One dispatch lifecycle notification failed.", {
        dispatchId: dispatch.id,
        error,
        salesId: input.meta.salesId,
      });
    }
  }
}

async function sendDispatchCompletedNotification(input: UpdateSalesControl) {
  const dispatchId = input.submitDispatch?.dispatchId;
  if (!dispatchId) return;

  const dispatch = await db.orderDelivery.findFirst({
    where: {
      id: dispatchId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      dueDate: true,
      deliveryMode: true,
      driverId: true,
      order: {
        select: {
          orderId: true,
        },
      },
    },
  });
  if (!dispatch) return;
  if (dispatch.status !== "completed") return;

  const notification = new NotificationService(tasks, {
    db,
    userId: input.meta.authorId,
  });
  await notification.send("sales_dispatch_completed", {
    author: {
      id: input.meta.authorId,
      role: "employee",
    },
    payload: {
      salesId: input.meta.salesId,
      orderNo: dispatch.order?.orderId || undefined,
      dispatchId: dispatch.id,
      deliveryMode: dispatch.deliveryMode || undefined,
      dueDate: dispatch.dueDate || undefined,
      driverId: dispatch.driverId || undefined,
      packedBy: input.meta.authorName || undefined,
      receivedBy: input.submitDispatch?.receivedBy || undefined,
      signature: input.submitDispatch?.signature || undefined,
      attachments: (input.submitDispatch?.attachments || [])
        .map((item) => String(item.pathname || "").trim())
        .filter(Boolean),
    },
  } as any);
}

async function sendProductionAssignedNotification(input: UpdateSalesControl) {
  const assignedToId = input.createAssignments?.assignedToId;
  if (!assignedToId) return;

  const order = await db.salesOrders.findFirst({
    where: {
      id: input.meta.salesId,
      deletedAt: null,
    },
    select: {
      id: true,
      orderId: true,
    },
  });
  if (!order) return;

  const assignedQty = (input.createAssignments?.selections || []).reduce(
    (total, selection) =>
      total +
      Number(
        selection.qty?.qty ||
          (selection.qty?.lh || 0) + (selection.qty?.rh || 0),
      ),
    0,
  );

  const notification = new NotificationService(tasks, {
    db,
    userId: input.meta.authorId,
  });
  const payload = {
    author: {
      id: input.meta.authorId,
      role: "employee",
    },
    recipients: [
      {
        ids: [assignedToId],
        role: "employee",
      },
    ],
    payload: {
      salesId: order.id,
      orderNo: order.orderId || undefined,
      assignedToId,
      assignedQty: assignedQty || undefined,
      itemCount: input.createAssignments?.selections?.length || undefined,
      dueDate: input.createAssignments?.dueDate || undefined,
    },
  } satisfies Omit<
    Extract<NotificationJobInput, { channel: "sales_production_assigned" }>,
    "channel"
  >;
  await notification.send("sales_production_assigned", payload);
}

async function sendProductionMaterialReviewNotification(
  input: UpdateSalesControl,
  response: unknown,
) {
  if (
    !input.submitAll ||
    !response ||
    typeof response !== "object" ||
    (response as any).state !== "pending_material_review" ||
    (response as any).idempotentReplay === true ||
    !Number.isInteger((response as any).reviewId)
  ) {
    return;
  }
  const review = await db.salesProductionSubmissionMaterialReview.findUnique({
    where: { id: (response as any).reviewId },
    select: {
      id: true,
      classificationReason: true,
      materialSnapshot: true,
      order: {
        select: { id: true, orderId: true, salesRepId: true },
      },
      submittedBy: {
        select: { id: true, name: true },
      },
      submissions: {
        where: { deletedAt: null },
        select: { qty: true },
      },
    },
  });
  if (!review?.order.salesRepId) return;
  const materialSnapshot = Array.isArray(review.materialSnapshot)
    ? review.materialSnapshot
    : [];
  const unresolvedMaterials = materialSnapshot.filter((material) => {
    if (!material || typeof material !== "object") return false;
    const readiness = String((material as any).readiness || "");
    return readiness !== "ready_for_production" && readiness !== "fulfilled";
  });
  const expectedAt =
    unresolvedMaterials
      .map((material) =>
        typeof (material as any).expectedAt === "string"
          ? (material as any).expectedAt
          : null,
      )
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const notification = new Notifications(db);
  await notification.create(
    "sales_production_submission_material_review",
    {
      reviewId: review.id,
      salesId: review.order.id,
      orderNo: review.order.orderId || undefined,
      workerId: review.submittedBy.id,
      workerName: review.submittedBy.name || undefined,
      submittedQty: review.submissions.reduce(
        (total, submission) => total + submission.qty,
        0,
      ),
      reason: review.classificationReason || "NOT_CONFIGURED",
      pendingMaterialCount: unresolvedMaterials.length,
      expectedAt,
    },
    {
      author: { id: input.meta.authorId, role: "employee" },
      recipients: [{ ids: [review.order.salesRepId], role: "employee" }],
      includeChannelSubscribers: false,
      allowFallbackRecipient: false,
      forceInAppRecipients: true,
    },
  );
}

export const updateSalesControl = schemaTask({
  id: "update-sales-control" as TaskName,
  schema: updateSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
    const authorizedInput = await authorizeTaskInput(
      input as UpdateSalesControl,
    );
    const action = resolveActionHandler(authorizedInput);
    if (action) {
      await enforceSpecialOrderForAction(authorizedInput);
      const response = await action(db, authorizedInput);
      if (
        shouldSyncInventoryProductionLifecycleForSalesControl(authorizedInput)
      ) {
        await syncInventoryProductionLifecycleForSale(
          db as any,
          authorizedInput.meta.salesId,
        );
      }
      if (authorizedInput.packItems) {
        await sendDispatchPackedNotification(authorizedInput);
      }
      if (authorizedInput.startDispatch || authorizedInput.cancelDispatch) {
        try {
          await sendDispatchLifecycleNotification(authorizedInput);
        } catch (error) {
          logger.error(
            "Sales control committed, but its dispatch notification failed.",
            {
              error,
              salesId: authorizedInput.meta.salesId,
            },
          );
        }
      }
      if (authorizedInput.submitDispatch) {
        await sendDispatchCompletedNotification(authorizedInput);
      }
      if (authorizedInput.createAssignments) {
        await sendProductionAssignedNotification(authorizedInput);
      }
      if (authorizedInput.submitAll) {
        try {
          await sendProductionMaterialReviewNotification(
            authorizedInput,
            response,
          );
        } catch (error) {
          logger.error(
            "Production submission committed, but its material review notification failed.",
            {
              error,
              salesId: authorizedInput.meta.salesId,
            },
          );
        }
      }
      return response;
    }
    throw new Error("Invalid action");
  },
});
