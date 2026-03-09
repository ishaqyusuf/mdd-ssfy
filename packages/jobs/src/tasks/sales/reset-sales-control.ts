import { TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import {
  resetSalesControlSchema,
  resetSalesTask,
  resolveResetSalesControlCommand,
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
    const repairCommand = resolveResetSalesControlCommand();
    await submitNonProductionsTask(db, {
      meta: input.meta,
      packItems: null as any,
      submitAll: null,
    });
    await resetSalesTask(db, input.meta.salesId);
    return {
      ok: true,
      repairCommand,
    };
  },
});
