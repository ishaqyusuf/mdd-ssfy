import { beforeEach, describe, expect, it, mock } from "bun:test";
import { tasks } from "@trigger.dev/sdk/v3";
import { queueDykeStepToInventorySync } from "./dyke-step-inventory-sync-job";

describe("queueDykeStepToInventorySync", () => {
  beforeEach(() => {
    (tasks as any).trigger = mock(async () => ({ id: "test-run" }));
  });

  it("queues dyke step inventory sync for a valid step", async () => {
    await queueDykeStepToInventorySync({
      stepId: 456,
      source: "event",
      strategy: "optimized",
    });

    expect(tasks.trigger).toHaveBeenCalledWith("sync-dyke-step-to-inventory", {
      stepId: 456,
      compare: undefined,
      strategy: "optimized",
      source: "event",
    });
  });

  it("does not queue when the step id is missing", async () => {
    await queueDykeStepToInventorySync({
      stepId: null,
      source: "event",
    });

    expect(tasks.trigger).toHaveBeenCalledTimes(0);
  });
});
