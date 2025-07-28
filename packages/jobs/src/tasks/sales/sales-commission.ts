import { TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { updateSalesControlSchema } from "@gnd/sales";
/**
 * RUNS EVERY DAY:
 * GET SUBMISSIONS FOR THE DAY, CREATE SALES COMMISSION AND LABOR
 */
export const salesCommission = schemaTask({
  id: "sales-commission" as TaskName,
  schema: updateSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
    // const r = await getSalesSetting(db);
    // return db.$transaction(async (tx) => {}, {
    //   maxWait: 30,
    // });
  },
});
