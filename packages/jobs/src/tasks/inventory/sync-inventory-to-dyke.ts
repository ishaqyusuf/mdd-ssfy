import { schemaTask } from "@trigger.dev/sdk/v3";
import { db } from "@gnd/db";
import { syncInventoryToDyke } from "@gnd/inventory";
import {
  syncInventoryToDykeSchemaTask,
  type TaskName,
} from "../../schema";

const syncInventoryToDykeId: TaskName = "sync-inventory-to-dyke";

export const syncInventoryToDykeTask = schemaTask({
  id: syncInventoryToDykeId,
  schema: syncInventoryToDykeSchemaTask,
  maxDuration: 900,
  queue: {
    concurrencyLimit: 4,
  },
  run: async (input) => {
    return syncInventoryToDyke(db, {
      inventoryCategoryId: input.inventoryCategoryId ?? null,
      inventoryId: input.inventoryId ?? null,
      inventoryVariantId: input.inventoryVariantId ?? null,
      mode: input.mode ?? "sync",
      source: input.source ?? "repair",
      triggeredByUserId: input.triggeredByUserId ?? null,
    });
  },
});
