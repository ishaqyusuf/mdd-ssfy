import { describe, expect, test } from "bun:test";

describe("inventoriesRouter", () => {
  test("loads with shared React TSX package imports", async () => {
    const mod = await import("./inventories.route");

    expect(mod.inventoriesRouter).toBeDefined();
  }, 10_000);

  test("guards Mark As inventory order ids as positive integers", async () => {
    const mod = await import("./inventories.route");

    expect(mod.salesInventoryOrderIdsSchema.safeParse([1, 2]).success).toBe(true);

    for (const salesOrderIds of [[], [0], [-1], [1.25]]) {
      expect(mod.salesInventoryOrderIdsSchema.safeParse(salesOrderIds).success).toBe(
        false,
      );
    }
  });

  test("guards ship-available inventory ids as positive integers", async () => {
    const mod = await import("./inventories.route");

    expect(
      mod.shipAvailableSalesInventorySchema.safeParse({
        salesOrderId: 1,
        lineItemIds: [2, 3],
      }).success,
    ).toBe(true);

    for (const input of [
      { salesOrderId: 0 },
      { salesOrderId: -1 },
      { salesOrderId: 1.25 },
      { salesOrderId: 1, lineItemIds: [0] },
      { salesOrderId: 1, lineItemIds: [2.5] },
    ]) {
      expect(mod.shipAvailableSalesInventorySchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  test("guards dispatch transition ids as positive integers", async () => {
    const mod = await import("./inventories.route");

    expect(
      mod.inventoryDispatchTransitionSchema.safeParse({
        salesOrderId: 1,
        lineItemIds: [2],
        allocationIds: [3],
      }).success,
    ).toBe(true);
    expect(
      mod.inventoryDispatchTransitionSchema.safeParse({
        allocationIds: [3],
      }).success,
    ).toBe(true);

    for (const input of [
      { salesOrderId: 0 },
      { salesOrderId: 1.25 },
      { lineItemIds: [-1] },
      { allocationIds: [2.5] },
    ]) {
      expect(mod.inventoryDispatchTransitionSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  test("guards dispatch fulfill and hold ids as positive integers", async () => {
    const mod = await import("./inventories.route");

    expect(
      mod.inventoryDispatchFulfillSchema.safeParse({
        salesOrderId: 1,
        allocationIds: [2],
      }).success,
    ).toBe(true);
    expect(
      mod.inventoryLineFulfillmentHoldSchema.safeParse({
        lineItemId: 1,
        holdUntilComplete: true,
      }).success,
    ).toBe(true);

    for (const input of [
      { salesOrderId: 0 },
      { salesOrderId: -1 },
      { salesOrderId: 1, lineItemIds: [1.25] },
    ]) {
      expect(mod.inventoryDispatchFulfillSchema.safeParse(input).success).toBe(
        false,
      );
    }

    for (const input of [
      { lineItemId: 0, holdUntilComplete: true },
      { lineItemId: 1.25, holdUntilComplete: false },
    ]) {
      expect(mod.inventoryLineFulfillmentHoldSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  test("guards inbound status ids as positive integers", async () => {
    const mod = await import("./inventories.route");

    expect(
      mod.updateInboundShipmentStatusSchema.safeParse({
        inboundId: 1,
        status: "cancelled",
      }).success,
    ).toBe(true);

    for (const input of [
      { inboundId: 0, status: "cancelled" },
      { inboundId: -1, status: "closed" },
      { inboundId: 1.25, status: "completed" },
    ]) {
      expect(mod.updateInboundShipmentStatusSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  test("guards inbound receive ids and quantities", async () => {
    const mod = await import("./inventories.route");

    expect(
      mod.receiveInboundShipmentSchema.safeParse({
        inboundId: 1,
        items: [
          {
            inboundShipmentItemId: 2,
            qtyGood: 4.5,
            qtyIssue: 0,
            unitPrice: 12.25,
          },
        ],
      }).success,
    ).toBe(true);

    for (const input of [
      { inboundId: 0 },
      { inboundId: 1.25 },
      { inboundId: 1, items: [{ inboundShipmentItemId: 0 }] },
      { inboundId: 1, items: [{ inboundShipmentItemId: 2.5 }] },
      { inboundId: 1, items: [{ inboundShipmentItemId: 2, qtyReceived: -1 }] },
      { inboundId: 1, items: [{ inboundShipmentItemId: 2, qtyGood: -1 }] },
      { inboundId: 1, items: [{ inboundShipmentItemId: 2, qtyIssue: -1 }] },
      { inboundId: 1, items: [{ inboundShipmentItemId: 2, unitPrice: -1 }] },
    ]) {
      expect(mod.receiveInboundShipmentSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  test("guards inbound assignment ids as positive integers", async () => {
    const mod = await import("./inventories.route");

    expect(
      mod.assignInboundDemandsSchema.safeParse({
        inboundId: 1,
        demandIds: [2, 3],
      }).success,
    ).toBe(true);

    for (const input of [
      { inboundId: 0, demandIds: [1] },
      { inboundId: 1.25, demandIds: [1] },
      { inboundId: 1, demandIds: [] },
      { inboundId: 1, demandIds: [0] },
      { inboundId: 1, demandIds: [2.5] },
    ]) {
      expect(mod.assignInboundDemandsSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  test("guards inbound creation ids and selected quantities", async () => {
    const mod = await import("./inventories.route");

    expect(
      mod.createInboundShipmentFromDemandsSchema.safeParse({
        supplierId: 1,
        demandIds: [2],
        lineItemComponentIds: [3],
        componentSelections: [
          {
            lineItemComponentIds: [4, 5],
            qty: 1.5,
          },
        ],
      }).success,
    ).toBe(true);

    for (const input of [
      { supplierId: 0 },
      { supplierId: 1.25 },
      { supplierId: 1, demandIds: [0] },
      { supplierId: 1, demandIds: [2.5] },
      { supplierId: 1, lineItemComponentIds: [-1] },
      {
        supplierId: 1,
        componentSelections: [{ lineItemComponentIds: [], qty: 1 }],
      },
      {
        supplierId: 1,
        componentSelections: [{ lineItemComponentIds: [2], qty: 0 }],
      },
      {
        supplierId: 1,
        componentSelections: [{ lineItemComponentIds: [2.5], qty: 1 }],
      },
    ]) {
      expect(
        mod.createInboundShipmentFromDemandsSchema.safeParse(input).success,
      ).toBe(false);
    }
  });

  test("guards stock allocation review ids and quantities", async () => {
    const mod = await import("@gnd/inventory/schema");

    expect(
      mod.approveStockAllocationSchema.safeParse({
        allocationId: 1,
        approvedQty: 2.5,
      }).success,
    ).toBe(true);
    expect(
      mod.rejectStockAllocationSchema.safeParse({
        allocationId: 1,
      }).success,
    ).toBe(true);
    expect(
      mod.bulkApproveStockAllocationSchema.safeParse({
        allocationIds: [1, 2],
      }).success,
    ).toBe(true);

    for (const input of [
      { allocationId: 0 },
      { allocationId: 1.25 },
      { allocationId: 1, approvedQty: 0 },
      { allocationId: 1, approvedQty: -1 },
    ]) {
      expect(mod.approveStockAllocationSchema.safeParse(input).success).toBe(
        false,
      );
    }

    for (const input of [{ allocationId: 0 }, { allocationId: 1.25 }]) {
      expect(mod.rejectStockAllocationSchema.safeParse(input).success).toBe(
        false,
      );
    }

    for (const input of [
      { allocationIds: [] },
      { allocationIds: [0] },
      { allocationIds: [2.5] },
    ]) {
      expect(mod.bulkApproveStockAllocationSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  test("guards inbound issue ids and quantities", async () => {
    const mod = await import("@gnd/inventory/schema");

    expect(
      mod.inboundItemIssueFormSchema.safeParse({
        inboundShipmentItemId: 1,
        issueType: "damaged",
        reportedQty: 2,
      }).success,
    ).toBe(true);
    expect(
      mod.resolveInboundItemIssueSchema.safeParse({
        issueId: 1,
        status: "resolved",
        resolutionType: "write_off",
        resolvedQty: 0,
      }).success,
    ).toBe(true);

    for (const input of [
      { id: 0, inboundShipmentItemId: 1, issueType: "damaged", reportedQty: 1 },
      { id: 1.25, inboundShipmentItemId: 1, issueType: "damaged", reportedQty: 1 },
      { inboundShipmentItemId: 0, issueType: "damaged", reportedQty: 1 },
      { inboundShipmentItemId: 1.25, issueType: "damaged", reportedQty: 1 },
      { inboundShipmentItemId: 1, issueType: "damaged", reportedQty: 0 },
      { inboundShipmentItemId: 1, issueType: "damaged", reportedQty: -1 },
      {
        inboundShipmentItemId: 1,
        issueType: "damaged",
        reportedQty: 1,
        resolvedQty: -1,
      },
    ]) {
      expect(mod.inboundItemIssueFormSchema.safeParse(input).success).toBe(
        false,
      );
    }

    for (const input of [
      { issueId: 0, status: "resolved" },
      { issueId: 1.25, status: "resolved" },
      { issueId: 1, status: "resolved", resolvedQty: -1 },
    ]) {
      expect(mod.resolveInboundItemIssueSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  test("guards stale cleanup repair ids and limits", async () => {
    const mod = await import("./inventories.route");

    expect(mod.cleanupStaleSalesInventoryLineItemsSchema.safeParse(undefined).success).toBe(
      true,
    );
    expect(
      mod.cleanupStaleSalesInventoryLineItemsSchema.safeParse({
        lineItemIds: [1, 2],
        limit: 50,
        dryRun: false,
      }).success,
    ).toBe(true);

    for (const input of [
      { lineItemIds: [] },
      { lineItemIds: [0] },
      { lineItemIds: [1.25] },
      { limit: 0 },
      { limit: 501 },
      { limit: 1.25 },
    ]) {
      expect(
        mod.cleanupStaleSalesInventoryLineItemsSchema.safeParse(input).success,
      ).toBe(false);
    }
  });
});
