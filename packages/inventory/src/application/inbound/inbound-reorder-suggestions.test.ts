import { describe, expect, test } from "bun:test";

import { buildSupplierReorderSuggestions } from "./inbound-demand";

describe("buildSupplierReorderSuggestions", () => {
  test("groups open demand by supplier and variant with supplier order policy", () => {
    const suggestions = buildSupplierReorderSuggestions([
      {
        id: 1,
        qty: 4,
        qtyReceived: 1,
        inventoryVariantId: 100,
        inventoryVariant: {
          sku: "HINGE-BLK",
          inventory: {
            name: "Black hinge",
          },
          supplierVariants: [
            {
              supplierId: 20,
              supplier: {
                id: 20,
                name: "Hardware Co",
              },
              supplierSku: "HW-HINGE-BLK",
              minOrderQty: 10,
              leadTimeDays: 7,
              preferred: true,
              active: true,
            },
          ],
        },
      },
      {
        id: 2,
        qty: 5,
        qtyReceived: 0,
        inventoryVariantId: 100,
        inventoryVariant: {
          sku: "HINGE-BLK",
          inventory: {
            name: "Black hinge",
          },
          supplierVariants: [
            {
              supplierId: 20,
              supplier: {
                id: 20,
                name: "Hardware Co",
              },
              minOrderQty: 10,
              leadTimeDays: 7,
              preferred: true,
              active: true,
            },
          ],
        },
      },
    ]);

    expect(suggestions.summary).toEqual({
      suggestionCount: 1,
      supplierCount: 1,
      openDemandQty: 8,
      suggestedOrderQty: 10,
    });
    expect(suggestions.suggestions[0]).toMatchObject({
      supplierId: 20,
      supplierName: "Hardware Co",
      inventoryVariantId: 100,
      inventoryName: "Black hinge",
      sku: "HINGE-BLK",
      supplierSku: "HW-HINGE-BLK",
      openDemandQty: 8,
      suggestedOrderQty: 10,
      minOrderQty: 10,
      leadTimeDays: 7,
      demandCount: 2,
      demandIds: [1, 2],
    });
  });

  test("uses assigned inbound supplier before preferred supplier", () => {
    const suggestions = buildSupplierReorderSuggestions([
      {
        id: 3,
        qty: 2,
        qtyReceived: 0,
        inventoryVariantId: 101,
        inboundShipmentItem: {
          inbound: {
            supplierId: 30,
            supplier: {
              id: 30,
              name: "Assigned Supplier",
            },
          },
        },
        inventoryVariant: {
          sku: "SLAB-36",
          inventory: {
            name: "Door slab",
          },
          supplierVariants: [
            {
              supplierId: 20,
              supplier: {
                id: 20,
                name: "Preferred Supplier",
              },
              minOrderQty: 1,
              preferred: true,
              active: true,
            },
          ],
        },
      },
    ]);

    expect(suggestions.suggestions[0]).toMatchObject({
      supplierId: 30,
      supplierName: "Assigned Supplier",
      suggestedOrderQty: 2,
    });
  });
});
