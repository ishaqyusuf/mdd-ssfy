import { TaskName, updateSalesControlSchema } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";

export const updateSalesControl = schemaTask({
  id: "update-sales-control" as TaskName,
  schema: updateSalesControlSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (input) => {
    //
  },
});
