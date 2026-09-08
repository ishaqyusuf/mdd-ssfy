import { schemaTask } from "@trigger.dev/sdk/v3";
import {
  syncSalesInventoryLineItemsSchemaTask,
  type TaskName,
} from "../../schema";
import { db } from "@gnd/db";
import { runSalesPostSaveSync } from "@sales/run-sales-post-save-sync";

export const syncSalesInventoryLineItemsTask = schemaTask({
  id: "sync-sales-inventory-line-items" as TaskName,
  schema: syncSalesInventoryLineItemsSchemaTask,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (payload) => {
    return runSalesPostSaveSync(db, {
      salesOrderId: payload.salesOrderId,
      skipInventory: payload.skipInventory,
      source: payload.source,
      triggeredByUserId: payload.triggeredByUserId ?? null,
    });
  },
});
