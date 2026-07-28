import { schemaTask } from "@trigger.dev/sdk/v3";
import {
  syncSalesInventoryLineItemsSchemaTask,
  type TaskName,
} from "../../schema";
import { db } from "@gnd/db";
import { runSalesInventoryProjectionSync } from "@sales/run-sales-inventory-projection-sync";

export const syncSalesInventoryLineItemsTask = schemaTask({
  id: "sync-sales-inventory-line-items" as TaskName,
  schema: syncSalesInventoryLineItemsSchemaTask,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (payload) => {
    return runSalesInventoryProjectionSync(db, {
      salesOrderId: payload.salesOrderId,
      source: payload.source,
      triggeredByUserId: payload.triggeredByUserId ?? null,
    });
  },
});
