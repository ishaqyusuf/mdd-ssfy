import { tasks } from "@trigger.dev/sdk/v3";

export type SalesInventorySyncSource =
  | "new-form"
  | "old-form"
  | "copy-sales"
  | "adjustment"
  | "manual"
  | "repair";

export type QueueSalesInventoryLineItemsSyncInput = {
  salesOrderId: number;
  source: SalesInventorySyncSource;
  triggeredByUserId?: number | null;
  skipInventory?: boolean;
};

export async function queueSalesInventoryLineItemsSync(
  input: QueueSalesInventoryLineItemsSyncInput,
) {
  return tasks
    .trigger("sync-sales-inventory-line-items", {
      salesOrderId: input.salesOrderId,
      ...(input.skipInventory ? { skipInventory: true } : {}),
      source: input.source,
      triggeredByUserId: input.triggeredByUserId ?? null,
    })
    .catch((error) => {
      console.error("Unable to queue sales inventory line item sync", error);
      return null;
    });
}
