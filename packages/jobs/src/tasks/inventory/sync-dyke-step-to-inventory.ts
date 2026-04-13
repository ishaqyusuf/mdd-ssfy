import { schemaTask } from "@trigger.dev/sdk/v3";
import { db } from "@gnd/db";
import { inventoryUpdateFromDyke } from "@gnd/inventory";
import {
  syncDykeStepToInventorySchemaTask,
  type TaskName,
} from "../../schema";

const syncDykeStepToInventoryId: TaskName = "sync-dyke-step-to-inventory";

export const syncDykeStepToInventory = schemaTask({
  id: syncDykeStepToInventoryId,
  schema: syncDykeStepToInventorySchemaTask,
  maxDuration: 900,
  queue: {
    concurrencyLimit: 4,
  },
  run: async (input) => {
    return inventoryUpdateFromDyke(db, {
      stepId: input.stepId,
      compare: input.compare,
      strategy: input.strategy,
      source: "job",
    });
  },
});
