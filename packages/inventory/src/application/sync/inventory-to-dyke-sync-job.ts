import { tasks } from "@trigger.dev/sdk/v3";
import type { InventoryToDykeSyncSource } from "../../schema";

export type QueueInventoryToDykeSyncInput = {
  inventoryCategoryId?: number | null;
  inventoryId?: number | null;
  inventoryVariantId?: number | null;
  compare?: boolean;
  source?: InventoryToDykeSyncSource;
};

export async function queueInventoryToDykeSync(
  input: QueueInventoryToDykeSyncInput,
) {
  if (!input.inventoryCategoryId && !input.inventoryId && !input.inventoryVariantId) {
    return null;
  }

  return tasks
    .trigger("sync-inventory-to-dyke", {
      inventoryCategoryId: input.inventoryCategoryId ?? null,
      inventoryId: input.inventoryId ?? null,
      inventoryVariantId: input.inventoryVariantId ?? null,
      mode: input.compare ? "compare" : "sync",
      source: input.source ?? "repair",
    })
    .catch((error) => {
      console.error("Unable to queue inventory-to-dyke sync", error);
      return null;
    });
}
