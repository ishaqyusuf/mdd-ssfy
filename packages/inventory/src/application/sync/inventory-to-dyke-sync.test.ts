import { beforeEach, describe, expect, it, mock } from "bun:test";
import { tasks } from "@trigger.dev/sdk/v3";
import { queueInventoryToDykeSync } from "./inventory-to-dyke-sync-job";
import { syncInventoryToDyke } from "./dyke-update-from-inventory";
import {
  buildLegacyDoorSupplierPricingKeys,
  parseDykeSupplierPricingKey,
} from "../suppliers/suppliers";
import type { Db } from "@gnd/db";

// ---- Queue helper tests ----

describe("queueInventoryToDykeSync", () => {
  beforeEach(() => {
    (tasks as any).trigger = mock(async () => ({ id: "test-run" }));
  });

  it("queues sync-inventory-to-dyke for a valid inventory item", async () => {
    await queueInventoryToDykeSync({
      inventoryId: 123,
      source: "inventory-form",
    });

    expect(tasks.trigger).toHaveBeenCalledWith("sync-inventory-to-dyke", {
      inventoryCategoryId: null,
      inventoryId: 123,
      inventoryVariantId: null,
      mode: "sync",
      source: "inventory-form",
    });
  });

  it("queues in compare mode", async () => {
    await queueInventoryToDykeSync({
      inventoryCategoryId: 5,
      compare: true,
      source: "repair",
    });

    expect(tasks.trigger).toHaveBeenCalledWith("sync-inventory-to-dyke", {
      inventoryCategoryId: 5,
      inventoryId: null,
      inventoryVariantId: null,
      mode: "compare",
      source: "repair",
    });
  });

  it("ignores empty payloads (no ids provided)", async () => {
    const result = await queueInventoryToDykeSync({
      inventoryId: null,
      source: "repair",
    });

    expect(result).toBeNull();
    expect(tasks.trigger).toHaveBeenCalledTimes(0);
  });
});

// ---- Supplier key utilities tests ----

describe("buildLegacyDoorSupplierPricingKeys", () => {
  it("generates keys for supplier + size", () => {
    const keys = buildLegacyDoorSupplierPricingKeys({
      supplierUid: "SUP1",
      size: "36x80",
    });
    expect(keys).toContain("36x80 & SUP1");
    expect(keys).toContain("SUP1-36x80");
    expect(keys).toContain("36x80-SUP1");
    expect(keys).toContain("SUP1");
  });

  it("generates keys for supplier + depValues", () => {
    const keys = buildLegacyDoorSupplierPricingKeys({
      supplierUid: "SUP1",
      depValues: ["val1", "val2"],
    });
    expect(keys).toContain("SUP1-val1-val2");
    expect(keys).toContain("val1-val2-SUP1");
    expect(keys).toContain("SUP1");
  });

  it("returns empty for no input", () => {
    const keys = buildLegacyDoorSupplierPricingKeys({});
    expect(keys).toEqual([]);
  });
});

describe("parseDykeSupplierPricingKey", () => {
  it("parses exact supplier UID match", () => {
    const result = parseDykeSupplierPricingKey("SUP1", ["SUP1", "SUP2"]);
    expect(result).toEqual({
      supplierUid: "SUP1",
      variantUid: "",
      size: null,
      pricingKey: "SUP1",
    });
  });

  it("parses supplier UID with size suffix: '36x80 & SUP1'", () => {
    const result = parseDykeSupplierPricingKey("36x80 & SUP1", ["SUP1"]);
    expect(result).toEqual({
      supplierUid: "SUP1",
      variantUid: "36x80",
      size: "36x80",
      pricingKey: "36x80 & SUP1",
    });
  });

  it("parses supplier UID with prefix: 'SUP1-36x80'", () => {
    const result = parseDykeSupplierPricingKey("SUP1-36x80", ["SUP1"]);
    expect(result).toEqual({
      supplierUid: "SUP1",
      variantUid: "36x80",
      size: "36x80",
      pricingKey: "SUP1-36x80",
    });
  });

  it("parses supplier UID with postfix: '36x80-SUP1'", () => {
    const result = parseDykeSupplierPricingKey("36x80-SUP1", ["SUP1"]);
    expect(result).toEqual({
      supplierUid: "SUP1",
      variantUid: "36x80",
      size: "36x80",
      pricingKey: "36x80-SUP1",
    });
  });

  it("returns null for unrecognized key", () => {
    const result = parseDykeSupplierPricingKey("unknown-format", ["SUP1"]);
    expect(result).toBeNull();
  });
});

// ---- Type helpers for fake delegates ----
type Store = Record<string, any>;
type Where = Record<string, any>;

function matchRecord(record: Record<string, any>, where: Where): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Nested object (e.g. { inventoryCategory: { uid: "x" } })
      const nestedVal = record[key];
      return nestedVal != null && matchRecord(nestedVal, value);
    }
    if (value && typeof value === "object" && "in" in value) {
      return (value.in as any[]).includes(record[key]);
    }
    return record[key] === value;
  });
}

// ---- Sync service tests (compare mode) ----

describe("syncInventoryToDyke compare mode", () => {
  it("returns compare result without mutating", async () => {
    let writesHappened = false;

    const db = {
      inventoryCategory: {
        findUnique: async () => ({
          id: 1,
          uid: "cat-1",
          title: "Doors",
          deletedAt: null,
        }),
      },
      dykeSteps: {
        findFirst: async () => ({
          id: 100,
          title: "Doors",
          deletedAt: null,
        }),
        updateMany: async () => {
          writesHappened = true;
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryCategoryId: 1,
      mode: "compare",
      source: "repair",
    });

    expect(result.mode).toBe("compare");
    expect(writesHappened).toBe(false);
  });

  it("returns category archive count in compare mode", async () => {
    const db = {
      inventoryCategory: {
        findUnique: async () => ({
          id: 1,
          uid: "cat-1",
          title: "Doors",
          deletedAt: new Date(),
        }),
      },
      dykeSteps: {
        findFirst: async () => ({
          id: 100,
          title: "Doors",
          deletedAt: null,
        }),
        updateMany: async () => ({ count: 1 }),
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryCategoryId: 1,
      mode: "compare",
      source: "repair",
    });

    expect(result.category.archived).toBe(1);
    expect(result.category.created).toBe(0);
    expect(result.category.updated).toBe(0);
  });

  it("category delete sync soft-archives matching Dyke step", async () => {
    let archivedDykeStepId: number | undefined;

    const db = {
      inventoryCategory: {
        findUnique: async () => ({
          id: 1,
          uid: "cat-1",
          title: "Doors",
          deletedAt: new Date(),
        }),
      },
      dykeSteps: {
        findFirst: async () => ({
          id: 100,
          title: "Doors",
          deletedAt: null,
        }),
        updateMany: async (args: any) => {
          archivedDykeStepId = args?.where?.id;
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryCategoryId: 1,
      mode: "sync",
      source: "repair",
    });

    expect(result.category.archived).toBe(1);
  });

  it("handles empty payload gracefully", async () => {
    const db = {} as unknown as Db;
    const result = await syncInventoryToDyke(db, {
      mode: "compare",
      source: "repair",
    });

    expect(result.category.created).toBe(0);
    expect(result.products.created).toBe(0);
    expect(result.variants.created).toBe(0);
    expect(result.pricing.created).toBe(0);
  });
});

// ---- Generic pricing tests ----

describe("syncInventoryToDyke generic pricing", () => {
  it("updates existing DykePricingSystem row matching variant.uid", async () => {
    let updatedPrice: number | undefined;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-abc-123",
          status: "published",
          deletedAt: null,
          inventoryId: 1,
          inventory: {
            uid: "prod-uid-1",
            inventoryCategoryId: 5,
            sourceStepUid: null,
            sourceComponentUid: null,
            inventoryCategory: { uid: "step-uid-1" },
          },
          pricing: { id: 50, price: 125.0, costPrice: 120.0 },
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [
          { id: 300, dependenciesUid: "var-abc-123", price: 100.0 },
        ],
        findFirst: async () => null,
        updateMany: async (args: any) => {
          updatedPrice = args?.data?.price;
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-form",
    });

    expect(result.pricing.updated).toBe(1);
    expect(result.pricing.created).toBe(0);
    expect(updatedPrice).toBe(125);
  });

  it("creates DykePricingSystem with dependenciesUid = variant.uid", async () => {
    let createdDepsUid: string | undefined;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-xyz-456",
          status: "published",
          deletedAt: null,
          inventoryId: 1,
          inventory: {
            uid: "prod-uid-1",
            inventoryCategoryId: 5,
            sourceStepUid: null,
            sourceComponentUid: null,
            inventoryCategory: { uid: "step-uid-1" },
          },
          pricing: { id: 51, price: 75.0, costPrice: null },
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async (args: any) => {
          createdDepsUid = args?.data?.dependenciesUid;
          return { id: 400, ...args.data };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-form",
    });

    expect(result.pricing.created).toBe(1);
    expect(createdDepsUid).toBe("var-xyz-456");
  });
});

// ---- Supplier pricing tests ----

describe("syncInventoryToDyke supplier pricing", () => {
  it("updates existing row matching original pricing key", async () => {
    let updatedPrice: number | undefined;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-abc-123",
          status: "published",
          deletedAt: null,
          inventoryId: 1,
          inventory: {
            uid: "prod-uid-1",
            inventoryCategoryId: 5,
            sourceStepUid: null,
            sourceComponentUid: null,
            inventoryCategory: { uid: "step-uid-1" },
          },
          pricing: null,
          supplierVariants: [
            {
              id: 1,
              supplierId: 10,
              costPrice: 80.0,
              salesPrice: 90.0,
              meta: { pricingKey: "36x80 & SUP1", size: "36x80" },
              supplier: { uid: "SUP1", name: "Acme" },
            },
          ],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [
          { id: 301, dependenciesUid: "36x80 & SUP1", price: 75.0 },
        ],
        updateMany: async (args: any) => {
          updatedPrice = args?.data?.price;
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "supplier-variant",
    });

    expect(result.pricing.updated).toBe(1);
    expect(updatedPrice).toBe(90);
  });

  it("skips without creating when original key is missing and no row matches", async () => {
    let createCalled = false;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-abc-123",
          status: "published",
          deletedAt: null,
          inventoryId: 1,
          inventory: {
            uid: "prod-uid-1",
            inventoryCategoryId: 5,
            sourceStepUid: null,
            sourceComponentUid: null,
            inventoryCategory: { uid: "step-uid-1" },
          },
          pricing: null,
          supplierVariants: [
            {
              id: 2,
              supplierId: 11,
              costPrice: 50.0,
              salesPrice: 55.0,
              meta: {}, // no pricingKey
              supplier: { uid: "SUP2", name: "Beta" },
            },
          ],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [],
        create: async () => {
          createCalled = true;
          return { id: 999 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "supplier-variant",
    });

    expect(createCalled).toBe(false);
    expect(result.pricing.created).toBe(0);
    expect(result.pricing.skipped.length).toBeGreaterThanOrEqual(1);
    expect(result.pricing.skipped[0]!.reason).toBe(
      "missing_original_supplier_pricing_key",
    );
  });
});

// ---- Pricing skip routing tests (Fix A) ----

describe("syncInventoryToDyke pricing skip routing", () => {
  it("routes pricing skips to pricing.skipped not variants.skipped", async () => {
    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-xxx",
          status: "published",
          deletedAt: null,
          inventoryId: 1,
          inventory: {
            uid: "prod-uid-1",
            inventoryCategoryId: 5,
            sourceStepUid: null,
            sourceComponentUid: null,
            inventoryCategory: { uid: "step-uid-1" },
          },
          pricing: { id: 99, price: 200.0, costPrice: 180.0 },
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [
          // Two rows with same depsUid = ambiguous
          { id: 500, dependenciesUid: "var-xxx", price: 150.0 },
          { id: 501, dependenciesUid: "var-xxx", price: 151.0 },
        ],
        findFirst: async () => null,
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-form",
    });

    expect(result.pricing.skipped.length).toBeGreaterThanOrEqual(1);
    expect(result.pricing.skipped[0]!.reason).toBe(
      "ambiguous_generic_pricing_match",
    );
    expect(result.variants.skipped.length).toBe(0);
  });
});
