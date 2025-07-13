import { sendSalesEmailSchema } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";

export const sendSalesEmail = schemaTask({
  id: "send-sales-email",
  schema: sendSalesEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async ({}) => {},
});
