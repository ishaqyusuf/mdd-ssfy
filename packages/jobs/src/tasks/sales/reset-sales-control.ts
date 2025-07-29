import { TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import {
  resetSalesControlSchema,
  resetSalesTask,
  submitNonProductionsTask,
} from "@gnd/sales";
import { db } from "@gnd/db";

export const resetSalesControl = schemaTask({
  id: "reset-sales-control" as TaskName,
  schema: resetSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
    await submitNonProductionsTask(db, {
      meta: {
        salesId: input.salesId,
      } as any,
      packItems: null as any,
      submitAll: null,
    });
    await resetSalesTask(db, input.salesId);
  },
});
