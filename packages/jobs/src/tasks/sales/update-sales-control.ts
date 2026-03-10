import { TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
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

export const updateSalesControl = schemaTask({
  id: "update-sales-control" as TaskName,
  schema: updateSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
    const action = resolveActionHandler(input as UpdateSalesControl);
    if (action) return await action(db, input);
    throw new Error("Invalid action");
  },
});
