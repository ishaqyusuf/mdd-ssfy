import { TaskName } from "@jobs/schema";
import { schemaTask, tasks } from "@trigger.dev/sdk/v3";
import {
  cancelDispatchTask,
  clearPackingTask,
  isControlWriteV2Enabled,
  type LegacyUpdateSalesControlAction,
  createAssignmentsTask,
  deleteAssignmentsTasks,
  deleteSubmissionsTask,
  markAsCompletedTask,
  packDispatchItemTask,
  resolveLegacyUpdateSalesControlAction,
  startDispatchTask,
  submitAllTask,
  submitDispatchTask,
  type UpdateSalesControl,
  updateSalesControlSchema,
} from "@gnd/sales";
import { db } from "@gnd/db";
import type { NotificationJobInput } from "@notifications/schemas";

const actionMaps: Record<LegacyUpdateSalesControlAction, any> = {
  submitAll: submitAllTask,
  packItems: packDispatchItemTask,
  clearPackings: clearPackingTask,
  cancelDispatch: cancelDispatchTask,
  startDispatch: startDispatchTask,
  submitDispatch: submitDispatchTask,
  createAssignments: createAssignmentsTask,
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

async function sendDispatchPackedNotification(
  input: UpdateSalesControl,
  response: unknown,
) {
  if (!input.packItems?.dispatchId) return;
  const dispatchStatus = String(input.packItems.dispatchStatus || "");
  if (dispatchStatus === "completed" || dispatchStatus === "cancelled") return;
  const createdCount = Number((response as any)?.created || 0);
  const usedReplaceExisting = Boolean(input.packItems?.replaceExisting);
  if (createdCount <= 0 && !usedReplaceExisting) return;

  const dispatch = await db.orderDelivery.findFirst({
    where: {
      id: input.packItems.dispatchId,
      deletedAt: null,
    },
    select: {
      id: true,
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
  if (!dispatch?.driverId) return;

  await tasks.trigger("notification", {
    channel: "sales_dispatch_packed",
    author: {
      id: input.meta.authorId,
      role: "employee",
    },
    recipients: [
      {
        ids: [dispatch.driverId],
        role: "employee",
      },
    ],
    payload: {
      orderNo: dispatch.order?.orderId || undefined,
      dispatchId: dispatch.id,
      deliveryMode: dispatch.deliveryMode || undefined,
      dueDate: dispatch.dueDate || undefined,
      driverId: dispatch.driverId,
    },
  } as NotificationJobInput);
}

export const updateSalesControl = schemaTask({
  id: "update-sales-control" as TaskName,
  schema: updateSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
    const action = resolveActionHandler(input as UpdateSalesControl);
    if (action) {
      const response = await action(db, input);
      if (input.packItems) {
        await sendDispatchPackedNotification(input as UpdateSalesControl, response);
      }
      return response;
    }
    throw new Error("Invalid action");
  },
});
