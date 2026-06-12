import { beforeEach, describe, expect, it, mock } from "bun:test";
import { tasks } from "@trigger.dev/sdk/v3";
import { queueSalesInventoryLineItemsSync } from "./sales-inventory-sync-job";

describe("queueSalesInventoryLineItemsSync", () => {
  beforeEach(() => {
    (tasks as any).trigger = mock(async () => ({ id: "test-run" }));
  });

  it("queues the sales inventory line item sync task", async () => {
    await queueSalesInventoryLineItemsSync({
      salesOrderId: 123,
      source: "old-form",
      triggeredByUserId: 77,
    });

    expect(tasks.trigger).toHaveBeenCalledWith(
      "sync-sales-inventory-line-items",
      {
        salesOrderId: 123,
        source: "old-form",
        triggeredByUserId: 77,
      },
    );
  });

  it("keeps copy sales as a distinct sync source", async () => {
    await queueSalesInventoryLineItemsSync({
      salesOrderId: 456,
      source: "copy-sales",
      triggeredByUserId: 88,
    });

    expect(tasks.trigger).toHaveBeenCalledWith(
      "sync-sales-inventory-line-items",
      {
        salesOrderId: 456,
        source: "copy-sales",
        triggeredByUserId: 88,
      },
    );
  });
});
