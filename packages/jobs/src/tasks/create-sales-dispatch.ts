import { createSalesDispatchSchemaTask, TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
const BATCH_SIZE = 500;

export const example = schemaTask({
  id: "create-sales-dispatch" as TaskName,
  schema: createSalesDispatchSchemaTask,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async ({}) => {
    // submit-sales-assignment.ts -> create-payroll.ts ?createPayrollAction
  },
});
