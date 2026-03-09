import { TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import {
  cancelDispatchTask,
  clearPackingTask,
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

export const updateSalesControl = schemaTask({
  id: "update-sales-control" as TaskName,
  schema: updateSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
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
    const mapping = resolveLegacyUpdateSalesControlAction(
      input as UpdateSalesControl,
    );
    const action = mapping ? actionMaps[mapping.action] : null;
    if (action) return await action(db, input);
    throw new Error("Invalid action");
  },
});
