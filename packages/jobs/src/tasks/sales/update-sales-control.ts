import { TaskName, updateSalesControlSchema } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { getSalesSetting } from "@gnd/sales";
import { db } from "@gnd/db";
export const updateSalesControl = schemaTask({
  id: "update-sales-control" as TaskName,
  schema: updateSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
    const r = await getSalesSetting(db);
    return db.$transaction(async (tx) => {}, {
      maxWait: 30,
    });
  },
});
