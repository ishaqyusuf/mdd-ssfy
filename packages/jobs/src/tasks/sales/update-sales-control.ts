import { TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import {
  clearPackingTask,
  createAssignmentsTask,
  packDispatchItemTask,
  submitAllTask,
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
    const actionMaps: Partial<{ [k in keyof typeof input]: any }> = {
      submitAll: submitAllTask,
      packItems: packDispatchItemTask,
      clearPackings: clearPackingTask,
      createAssignments: createAssignmentsTask,
    };
    const actionKey = Object.entries(input).find(
      ([k, v]) => !!v && !!(actionMaps as any)[k as any]
    )?.[0]!;
    const action = (actionMaps as any)[actionKey];
    if (action) return await action(db, input);
    // TODO: "THROW ERROR"
    throw new Error("Invalid action");
    // if (input.submitAll) return submitAllTask(db, input);
    // if (input.packItems) return packDispatchItemTask(db, input);
    // if (input.clearPackings) return clearPackingTask(db, input);
    // if (input.createAssignments) return createAssignmentsTask;
  },
});
