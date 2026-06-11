import { tasks } from "@trigger.dev/sdk/v3";
import type { InventoryImportRun } from "../../schema";

export type QueueDykeStepToInventorySyncInput = {
  stepId: number | null | undefined;
  compare?: boolean;
  strategy?: InventoryImportRun["strategy"];
  source?: "manual" | "event" | "job";
};

export async function queueDykeStepToInventorySync(
  input: QueueDykeStepToInventorySyncInput,
) {
  if (!input.stepId) return null;

  return tasks
    .trigger("sync-dyke-step-to-inventory", {
      stepId: input.stepId,
      compare: input.compare,
      strategy: input.strategy,
      source: input.source ?? "event",
    })
    .catch((error) => {
      console.error("Unable to queue dyke step inventory sync", error);
      return null;
    });
}
