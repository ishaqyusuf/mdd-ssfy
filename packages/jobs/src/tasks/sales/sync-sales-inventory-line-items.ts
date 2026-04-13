import { schemaTask } from "@trigger.dev/sdk/v3";
import {
  syncSalesInventoryLineItemsSchemaTask,
  type TaskName,
} from "../../schema";
import { db } from "@gnd/db";
import { syncSalesInventoryLineItems } from "@sales/sync-sales-inventory-line-items";

export const syncSalesInventoryLineItemsTask = schemaTask({
  id: "sync-sales-inventory-line-items" as TaskName,
  schema: syncSalesInventoryLineItemsSchemaTask,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (payload) => {
    return db.$transaction((tx) =>
      syncSalesInventoryLineItems(tx, {
        salesOrderId: payload.salesOrderId,
        source: payload.source,
        triggeredByUserId: payload.triggeredByUserId ?? null,
      }),
    );
  },
});
