import { describe, expect, test } from "bun:test";
import {
  buildInventoryItemDashboardSummary,
  buildInventoryOperationsSummary,
  buildInventoryTopSalesAnalytics,
  buildInventoryVariantWorkspaceRow,
} from "./inventory";

describe("buildInventoryItemDashboardSummary", () => {
  test("summarizes stock, inbound, allocation, movement, sales, and quote counts", () => {
    const summary = buildInventoryItemDashboardSummary({
      variants: [
        {
          lowStockAlert: 5,
          stocks: [
            {
              qty: 3,
              price: 10,
            },
            {
              qty: 2,
              price: 12,
            },
          ],
          stockMovements: [{}, {}],
        },
        {
          lowStockAlert: 2,
          stocks: [
            {
              qty: 10,
              price: 5,
            },
          ],
          stockMovements: [{}],
        },
      ],
      inboundDemands: [
        {
          qty: 8,
          qtyReceived: 3,
          status: "ordered",
        },
        {
          qty: 4,
          qtyReceived: 4,
          status: "received",
        },
      ],
      allocations: [
        {
          qty: 2,
          status: "approved",
        },
        {
          qty: 1,
          status: "picked",
        },
        {
          qty: 9,
          status: "released",
        },
      ],
      relatedLineItems: [
        {
          lineItemType: "SALE",
          sale: {
            type: "order",
          },
        },
        {
          lineItemType: "QUOTE",
          sale: {
            type: "quote",
          },
        },
      ],
    });

    expect(summary).toMatchObject({
      variantCount: 2,
      totalStockQty: 15,
      totalStockValue: 104,
      lowStockVariantCount: 1,
      movementCount: 3,
      openInboundQty: 5,
      activeAllocationQty: 3,
      salesCount: 1,
      quoteCount: 1,
    });
    expect(summary.allocationQtyByStatus).toEqual({
      approved: 2,
      picked: 1,
      released: 9,
    });
  });
});

describe("buildInventoryTopSalesAnalytics", () => {
  test("ranks inventory items and variants by ordered and shipped quantities", () => {
    const analytics = buildInventoryTopSalesAnalytics({
      limit: 2,
      lineItems: [
        {
          id: 1,
          saleId: 100,
          qty: 4,
          totalCost: 400,
          inventory: {
            id: 10,
            name: "Door Slab",
            uid: "door-slab",
            inventoryCategory: {
              id: 1,
              title: "Doors",
            },
          },
          variant: {
            id: 101,
            sku: "SLAB-101",
          },
          price: {
            costPrice: 60,
          },
        },
        {
          id: 2,
          saleId: 101,
          qty: 2,
          unitCost: 75,
          inventory: {
            id: 11,
            name: "Hinge",
            uid: "hinge",
            inventoryCategory: {
              id: 2,
              title: "Hardware",
            },
          },
          variant: {
            id: 201,
            sku: "HINGE-201",
          },
        },
        {
          id: 3,
          saleId: 102,
          qty: 8,
          totalCost: 160,
          inventory: {
            id: 11,
            name: "Hinge",
            uid: "hinge",
            inventoryCategory: {
              id: 2,
              title: "Hardware",
            },
          },
          variant: {
            id: 201,
            sku: "HINGE-201",
          },
          price: {
            unitCostPrice: 5,
          },
        },
      ],
      allocations: [
        {
          id: 1,
          qty: 3,
          inventoryVariant: {
            id: 101,
            sku: "SLAB-101",
            inventory: {
              id: 10,
              name: "Door Slab",
              uid: "door-slab",
              inventoryCategory: {
                id: 1,
                title: "Doors",
              },
            },
          },
          lineItemComponent: {
            parent: {
              saleId: 100,
            },
          },
        },
        {
          id: 2,
          qty: 9,
          inventoryVariant: {
            id: 201,
            sku: "HINGE-201",
            inventory: {
              id: 11,
              name: "Hinge",
              uid: "hinge",
              inventoryCategory: {
                id: 2,
                title: "Hardware",
              },
            },
          },
          lineItemComponent: {
            parent: {
              saleId: 102,
            },
          },
        },
      ],
    });

    expect(analytics.summary).toMatchObject({
      inventoryBackedLineCount: 3,
      consumedAllocationCount: 2,
      orderedQty: 14,
      shippedQty: 12,
      revenue: 710,
      costValue: 280,
      grossMargin: 280,
      revenueReliableLineCount: 3,
      costReliableLineCount: 2,
    });
    expect(analytics.topItemsByOrderedQty[0]?.inventoryName).toBe("Hinge");
    expect(analytics.topItemsByShippedQty[0]?.inventoryName).toBe("Hinge");
    expect(analytics.topVariantsByOrderedQty[0]?.variantSku).toBe("HINGE-201");
    expect(analytics.topVariantsByShippedQty[0]?.variantSku).toBe("HINGE-201");
  });
});

describe("buildInventoryOperationsSummary", () => {
  test("summarizes stock tracking, low-stock alerts, inbound demand, allocations, backorders, and blockers", () => {
    const operations = buildInventoryOperationsSummary({
      variants: [
        {
          id: 1,
          uid: "variant-1",
          sku: "SLAB-1",
          lowStockAlert: 5,
          inventory: {
            id: 10,
            name: "Door Slab",
            stockMode: null,
            inventoryCategory: {
              title: "Doors",
              stockMode: "monitored",
            },
            defaultSupplier: {
              id: 101,
              name: "Default Doors",
            },
          },
          stocks: [
            {
              qty: 0,
            },
          ],
          supplierVariants: [
            {
              preferred: true,
              leadTimeDays: 7,
              supplier: {
                id: 201,
                name: "Preferred Doors",
              },
            },
          ],
        },
        {
          id: 2,
          uid: "variant-2",
          sku: "HINGE-2",
          lowStockAlert: 3,
          inventory: {
            id: 11,
            name: "Hinge",
            stockMode: "monitored",
            inventoryCategory: {
              title: "Hardware",
              stockMode: null,
            },
          },
          stocks: [
            {
              qty: 2,
            },
          ],
        },
        {
          id: 3,
          uid: "variant-3",
          sku: "TRIM-3",
          lowStockAlert: 2,
          inventory: {
            id: 12,
            name: "Trim",
            stockMode: "unmonitored",
            inventoryCategory: {
              title: "Trim",
              stockMode: null,
            },
          },
          stocks: [
            {
              qty: 1,
            },
          ],
        },
      ],
      openInboundDemands: [
        {
          qty: 8,
          qtyReceived: 3,
        },
        {
          qty: 2,
          qtyReceived: 0,
        },
      ],
      pendingAllocations: [
        {
          qty: 4,
        },
        {
          qty: 1,
        },
      ],
      backorderLineIds: [44, 44, 45],
      productionBlockerComponentIds: [5, 5, 6, 7],
    });

    expect(operations.summary).toMatchObject({
      totalVariants: 3,
      trackedVariants: 2,
      untrackedVariants: 1,
      trackedItems: 2,
      untrackedItems: 1,
      lowStockVariants: 2,
      outOfStockVariants: 1,
      openInboundDemandCount: 2,
      openInboundQty: 7,
      pendingAllocationCount: 2,
      pendingAllocationQty: 5,
      backorderedLineCount: 2,
      productionBlockerCount: 3,
    });
    expect(operations.alerts).toHaveLength(2);
    expect(operations.alerts[0]).toMatchObject({
      inventoryName: "Door Slab",
      supplierName: "Preferred Doors",
      leadTimeDays: 7,
      isOutOfStock: true,
    });
    expect(operations.trackingPolicy).toMatchObject({
      itemLevel: true,
      variantOverride: false,
      thresholdField: "InventoryVariant.lowStockAlert",
    });
  });
});

describe("buildInventoryVariantWorkspaceRow", () => {
  test("composes stock, pricing, supplier, and low-stock context", () => {
    const row = buildInventoryVariantWorkspaceRow({
      id: 10,
      uid: "variant-10",
      sku: "SKU-10",
      status: "published",
      lowStockAlert: 6,
      inventory: {
        id: 3,
        name: "Door Slab",
        uid: "door-slab",
        stockMode: null,
        inventoryCategory: {
          id: 2,
          title: "Doors",
          stockMode: "monitored",
        },
      },
      pricing: {
        price: 25,
        costPrice: 15,
      },
      stocks: [
        {
          id: 1,
          qty: 2,
          price: 10,
        },
        {
          id: 2,
          qty: 3,
          price: 12,
        },
      ],
      supplierVariants: [
        {
          id: 1,
          preferred: false,
          supplier: {
            id: 1,
            name: "Fallback Supplier",
          },
        },
        {
          id: 2,
          preferred: true,
          supplier: {
            id: 2,
            name: "Preferred Supplier",
          },
        },
      ],
      attributes: [],
    });

    expect(row).toMatchObject({
      id: 10,
      stockQty: 5,
      stockValue: 56,
      isLowStock: true,
      stockMode: "monitored",
      price: 25,
      costPrice: 15,
      supplierCount: 2,
    });
    expect(row.preferredSupplier?.supplier?.name).toBe("Preferred Supplier");
  });
});
