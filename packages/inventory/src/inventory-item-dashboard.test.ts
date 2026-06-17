import { describe, expect, test } from "bun:test";
import {
  buildInventoryBrowserValidationFixtureReport,
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
    expect(
      analytics.topItemsByOrderedQty.find((row) => row.inventoryName === "Door Slab")
        ?.saleCount,
    ).toBe(1);
    expect(
      analytics.topItemsByOrderedQty.find((row) => row.inventoryName === "Hinge")
        ?.saleCount,
    ).toBe(2);
    expect(analytics.caveats).toContain(
      "Shipped quantity is based on consumed stock allocations.",
    );
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

describe("buildInventoryBrowserValidationFixtureReport", () => {
  test("marks missing browser mutation fixtures as blocked", () => {
    const report = buildInventoryBrowserValidationFixtureReport({
      pending_allocation_review: {
        count: 7,
        samples: [
          { id: 1 },
          { id: 2 },
          { id: 3 },
          { id: 4 },
          { id: 5 },
          { id: 6 },
        ],
      },
      dispatch_assignable_allocation: { count: 0 },
      dispatch_packable_allocation: { count: 1 },
      dispatch_fulfillable_allocation: { count: 1 },
      open_inbound_demand: { count: 1 },
      inbound_receiving_shipment: { count: 0 },
      received_inbound_backorder: { count: 1 },
      partial_shipment_available: { count: 1 },
      held_partial_shipment: { count: 0 },
      low_stock_variant: { count: 1 },
      safe_stock_adjustment_variant: { count: 1 },
    });

    expect(report.status).toBe("blocked");
    expect(report.summary).toMatchObject({
      readyFixtureCount: 7,
      requiredFixtureCount: 11,
      missingFixtureCount: 4,
      readyWorkflowCount: 8,
      requiredWorkflowCount: 13,
      blockedWorkflowCount: 5,
    });
    expect(report.fixtures[0]).toMatchObject({
      count: 7,
      ready: true,
      workspaceHref: "/inventory/allocations",
      seedFixtureId: "INV-FIX-ALLOC",
      seedPlanHref:
        "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-alloc",
      recommendedAction:
        "Seed or identify at least three sale-line allocations with pending allocation review.",
      countDiagnostic: {
        countSource: "sql_count",
        sampleLimit: 5,
        complete: true,
      },
    });
    expect(report.fixtures[0]?.samples).toHaveLength(5);
    expect(report.missingFixtures.map((fixture) => fixture.key)).toEqual([
      "dispatch_assignable_allocation",
      "dispatch_packable_allocation",
      "inbound_receiving_shipment",
      "held_partial_shipment",
    ]);
    expect(report.missingFixtures[0]).toMatchObject({
      seedFixtureId: "INV-FIX-ALLOC",
      seedPlanHref:
        "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-alloc",
    });
    expect(report.diagnostics.seedFixturesToPrepare).toEqual([
      {
        seedFixtureId: "INV-FIX-ALLOC",
        seedPlanHref:
          "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-alloc",
        missingCount: 2,
        missingFixtureKeys: [
          "dispatch_assignable_allocation",
          "dispatch_packable_allocation",
        ],
        missingFixtureLabels: [
          "Dispatch assignable approved allocation",
          "Dispatch packable reserved allocation",
        ],
      },
      {
        seedFixtureId: "INV-FIX-INBOUND",
        seedPlanHref:
          "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-inbound",
        missingCount: 1,
        missingFixtureKeys: ["inbound_receiving_shipment"],
        missingFixtureLabels: ["Inbound shipment ready for receiving"],
      },
      {
        seedFixtureId: "INV-FIX-PARTIAL",
        seedPlanHref:
          "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-partial",
        missingCount: 1,
        missingFixtureKeys: ["held_partial_shipment"],
        missingFixtureLabels: ["Held partial shipment line"],
      },
    ]);
    expect(
      report.workflowMatrix
        .filter((workflow) => !workflow.ready)
        .map((workflow) => workflow.key),
    ).toEqual([
      "dispatch_assign",
      "dispatch_pack",
      "dispatch_release",
      "inbound_receive",
      "partial_hold_until_complete",
    ]);
    expect(report.workflowMatrix[0]?.candidateSamples).toEqual([
      { fixtureKey: "pending_allocation_review", id: 1 },
      { fixtureKey: "pending_allocation_review", id: 2 },
      { fixtureKey: "pending_allocation_review", id: 3 },
    ]);
    expect(report.workflowMatrix[0]?.primarySample).toEqual({
      fixtureKey: "pending_allocation_review",
      id: 1,
    });
  });

  test("groups multiple missing categories by the fixture seed to prepare", () => {
    const report = buildInventoryBrowserValidationFixtureReport({
      pending_allocation_review: { count: 0 },
      dispatch_assignable_allocation: { count: 0 },
      dispatch_packable_allocation: { count: 0 },
      dispatch_fulfillable_allocation: { count: 0 },
      open_inbound_demand: { count: 1 },
      inbound_receiving_shipment: { count: 1 },
      received_inbound_backorder: { count: 1 },
      partial_shipment_available: {
        count: 1,
        samples: [{ id: 30, orderId: "INV-FIX-PARTIAL" }],
      },
      held_partial_shipment: {
        count: 1,
        samples: [{ id: 31, orderId: "INV-FIX-PARTIAL" }],
      },
      low_stock_variant: { count: 1 },
      safe_stock_adjustment_variant: { count: 1 },
    });

    expect(report.diagnostics.seedFixturesToPrepare).toEqual([
      {
        seedFixtureId: "INV-FIX-ALLOC",
        seedPlanHref:
          "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-alloc",
        missingCount: 4,
        missingFixtureKeys: [
          "pending_allocation_review",
          "dispatch_assignable_allocation",
          "dispatch_packable_allocation",
          "dispatch_fulfillable_allocation",
        ],
        missingFixtureLabels: [
          "Pending allocation review",
          "Dispatch assignable approved allocation",
          "Dispatch packable reserved allocation",
          "Dispatch fulfillable picked allocation",
        ],
      },
    ]);
  });

  test("marks the browser mutation fixture set as ready when every category exists", () => {
    const report = buildInventoryBrowserValidationFixtureReport({
      pending_allocation_review: {
        count: 3,
        samples: [
          { id: 9, orderId: "INV-FIX-ALLOC" },
          { id: 10, orderId: "INV-FIX-ALLOC" },
          { id: 11, orderId: "INV-FIX-ALLOC" },
        ],
      },
      dispatch_assignable_allocation: {
        count: 2,
        samples: [
          { id: 20, orderId: "INV-FIX-ALLOC" },
          { id: 21, orderId: "INV-FIX-ALLOC" },
        ],
      },
      dispatch_packable_allocation: {
        count: 2,
        samples: [
          { id: 30, orderId: "INV-FIX-ALLOC" },
          { id: 31, orderId: "INV-FIX-ALLOC" },
        ],
      },
      dispatch_fulfillable_allocation: {
        count: 1,
        samples: [{ id: 40, orderId: "INV-FIX-ALLOC" }],
      },
      open_inbound_demand: {
        count: 1,
        samples: [{ id: 50, orderId: "INV-FIX-INBOUND" }],
      },
      inbound_receiving_shipment: {
        count: 1,
        samples: [{ id: 60, orderId: "INV-FIX-INBOUND" }],
      },
      received_inbound_backorder: { count: 1 },
      partial_shipment_available: {
        count: 1,
        samples: [{ id: 30, orderId: "INV-FIX-PARTIAL" }],
      },
      held_partial_shipment: {
        count: 1,
        samples: [{ id: 31, orderId: "INV-FIX-PARTIAL" }],
      },
      low_stock_variant: { count: 1 },
      safe_stock_adjustment_variant: { count: 1 },
    });

    expect(report.status).toBe("ready");
    expect(report.missingFixtures).toEqual([]);
    expect(report.nextAction).toContain("Run the approved browser workflow matrix");
    expect(report.summary).toMatchObject({
      readyWorkflowCount: 13,
      requiredWorkflowCount: 13,
      blockedWorkflowCount: 0,
    });
    expect(report.workflowMatrix[0]).toMatchObject({
      key: "allocation_approve",
      phase: "Allocation Review",
      runOrder: 10,
      ready: true,
      fixtureKeys: ["pending_allocation_review"],
      workspaceHref: "/inventory/allocations",
      operatorGuard:
        "Run before bulk approval; use only the primary sample so reject/bulk rows remain pending.",
      candidateSamples: [
        {
          fixtureKey: "pending_allocation_review",
          id: 9,
          orderId: "INV-FIX-ALLOC",
        },
        {
          fixtureKey: "pending_allocation_review",
          id: 10,
          orderId: "INV-FIX-ALLOC",
        },
        {
          fixtureKey: "pending_allocation_review",
          id: 11,
          orderId: "INV-FIX-ALLOC",
        },
      ],
      primarySample: {
        fixtureKey: "pending_allocation_review",
        id: 9,
        orderId: "INV-FIX-ALLOC",
      },
    });
    expect(
      report.workflowMatrix.find((workflow) => workflow.key == "allocation_reject")
        ?.primarySample,
    ).toEqual({
      fixtureKey: "pending_allocation_review",
      id: 10,
      orderId: "INV-FIX-ALLOC",
    });
    expect(
      report.workflowMatrix.find((workflow) => workflow.key == "allocation_reject"),
    ).toMatchObject({
      runOrder: 20,
      operatorGuard:
        "Run before bulk approval; use only the primary sample so the bulk row remains pending.",
    });
    expect(
      report.workflowMatrix.find(
        (workflow) => workflow.key == "allocation_bulk_approve",
      )?.primarySample,
    ).toEqual({
      fixtureKey: "pending_allocation_review",
      id: 11,
      orderId: "INV-FIX-ALLOC",
    });
    expect(
      report.workflowMatrix.find(
        (workflow) => workflow.key == "allocation_bulk_approve",
      ),
    ).toMatchObject({
      runOrder: 30,
      operatorGuard:
        "Run after the single approve and reject checks, with the remaining pending fixture row visible.",
    });
    expect(
      report.workflowMatrix.find((workflow) => workflow.key == "dispatch_pack")
        ?.primarySample,
    ).toEqual({
      fixtureKey: "dispatch_packable_allocation",
      id: 30,
      orderId: "INV-FIX-ALLOC",
    });
    expect(
      report.workflowMatrix.find((workflow) => workflow.key == "dispatch_pack"),
    ).toMatchObject({
      runOrder: 50,
      operatorGuard:
        "Use the primary reserved allocation; do not pack the release sample.",
    });
    expect(
      report.workflowMatrix.find((workflow) => workflow.key == "dispatch_release")
        ?.primarySample,
    ).toEqual({
      fixtureKey: "dispatch_packable_allocation",
      id: 31,
      orderId: "INV-FIX-ALLOC",
    });
    expect(
      report.workflowMatrix.find((workflow) => workflow.key == "dispatch_release"),
    ).toMatchObject({
      runOrder: 70,
      operatorGuard:
        "Use the second reserved primary sample so pack and release prove separate rows.",
    });
    expect(
      report.workflowMatrix.find((workflow) => workflow.key == "inbound_receive")
        ?.primarySample,
    ).toEqual({
      fixtureKey: "inbound_receiving_shipment",
      id: 60,
      orderId: "INV-FIX-INBOUND",
    });
    expect(
      report.workflowMatrix.find(
        (workflow) => workflow.key == "partial_ship_available",
      ),
    ).toMatchObject({
      fixtureKeys: ["partial_shipment_available"],
      ready: true,
      candidateSamples: [
        {
          fixtureKey: "partial_shipment_available",
          id: 30,
          orderId: "INV-FIX-PARTIAL",
        },
      ],
    });
  });

  test("surfaces incomplete count diagnostics for bounded fixture scans", () => {
    const report = buildInventoryBrowserValidationFixtureReport({
      pending_allocation_review: { count: 3 },
      dispatch_assignable_allocation: { count: 2 },
      dispatch_packable_allocation: { count: 2 },
      dispatch_fulfillable_allocation: { count: 1 },
      open_inbound_demand: { count: 1 },
      inbound_receiving_shipment: { count: 1 },
      received_inbound_backorder: { count: 1 },
      partial_shipment_available: { count: 1 },
      held_partial_shipment: {
        count: 1,
        countDiagnostic: {
          countSource: "bounded_application_scan",
          sampleLimit: 5,
          scanLimit: 100,
          scannedCount: 100,
          candidateCount: 128,
          complete: false,
          note: "Scans recent held-candidate lines.",
        },
      },
      low_stock_variant: { count: 1 },
      safe_stock_adjustment_variant: { count: 1 },
    });

    expect(report.status).toBe("ready");
    expect(report.fixtures.find((fixture) => fixture.key == "held_partial_shipment")).toMatchObject({
      countDiagnostic: {
        countSource: "bounded_application_scan",
        scanLimit: 100,
        scannedCount: 100,
        candidateCount: 128,
        complete: false,
      },
    });
    expect(report.diagnostics.incompleteCountFixtures).toEqual([
      expect.objectContaining({
        key: "held_partial_shipment",
        countDiagnostic: expect.objectContaining({
          complete: false,
          note: "Scans recent held-candidate lines.",
        }),
      }),
    ]);
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
