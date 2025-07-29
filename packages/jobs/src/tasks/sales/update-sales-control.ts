import { TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { submitAllTask, updateSalesControlSchema } from "@gnd/sales";
import { db } from "@gnd/db";

export const updateSalesControl = schemaTask({
  id: "update-sales-control" as TaskName,
  schema: updateSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
    if (input.submitAll) return submitAllTask(db, input);
  },
});
