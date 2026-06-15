import { beforeEach, describe, expect, it, mock } from "bun:test";
import { tasks } from "@trigger.dev/sdk/v3";
import { queueInventoryToDykeSync } from "./inventory-to-dyke-sync-job";
import { syncInventoryToDyke } from "./dyke-update-from-inventory";
import {
  buildLegacyDoorSupplierPricingKeys,
  parseDykeSupplierPricingKey,
} from "../suppliers/suppliers";
import { updateVariantStatus } from "../../inventory";
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
    expect(updatedPrice).toBe(120);
  });

  it("prefers inventory costPrice over stale price when syncing generic variant pricing", async () => {
    let updatedPrice: number | undefined;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-cost-wins",
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
          pricing: { id: 50, price: 500.0, costPrice: 125.0 },
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [
          { id: 300, dependenciesUid: "var-cost-wins", price: 100.0 },
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
      source: "variant-price",
    });

    expect(result.pricing.updated).toBe(1);
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

  it("does not report a created generic pricing row when an idempotency recheck finds one", async () => {
    let createCalled = false;
    let updateCalled = false;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-idem-generic",
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
          pricing: { id: 51, price: null, costPrice: 75.0 },
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [],
        findFirst: async () => ({ id: 400, price: 75.0 }),
        create: async () => {
          createCalled = true;
          return { id: 401 };
        },
        updateMany: async () => {
          updateCalled = true;
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-price",
    });

    expect(result.pricing.created).toBe(0);
    expect(result.pricing.updated).toBe(0);
    expect(createCalled).toBe(false);
    expect(updateCalled).toBe(false);
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

  it("creates supplier pricing only with preserved original pricing key", async () => {
    let createdDepsUid: string | undefined;
    let createdPrice: number | undefined;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-supplier-create",
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
        findMany: async () => [],
        findFirst: async () => null,
        create: async (args: any) => {
          createdDepsUid = args?.data?.dependenciesUid;
          createdPrice = args?.data?.price;
          return { id: 999, ...args.data };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "supplier-variant",
    });

    expect(result.pricing.created).toBe(1);
    expect(createdDepsUid).toBe("36x80 & SUP1");
    expect(createdPrice).toBe(90);
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

  it("skips ambiguous supplier pricing matches", async () => {
    let updateCalled = false;
    let createCalled = false;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-supplier-ambiguous",
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
          { id: 302, dependenciesUid: "SUP1-36x80", price: 76.0 },
        ],
        updateMany: async () => {
          updateCalled = true;
          return { count: 1 };
        },
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

    expect(result.pricing.updated).toBe(0);
    expect(result.pricing.created).toBe(0);
    expect(updateCalled).toBe(false);
    expect(createCalled).toBe(false);
    expect(result.pricing.skipped[0]!.reason).toBe(
      "ambiguous_supplier_pricing_match",
    );
  });

  it("compare mode reports supplier pricing create without writing", async () => {
    let createCalled = false;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-supplier-compare",
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
        findMany: async () => [],
        create: async () => {
          createCalled = true;
          return { id: 999 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "compare",
      source: "supplier-variant",
    });

    expect(result.pricing.created).toBe(1);
    expect(createCalled).toBe(false);
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

// ---- Variant archive tests (Pending 01 Fix) ----

describe("syncInventoryToDyke variant archive", () => {
  it("compare mode reports pricing.archived for archived variant without calling updateMany", async () => {
    let updateManyCalled = false;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-arch-1",
          status: "archived",
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
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [
          { id: 700, dependenciesUid: "var-arch-1" },
        ],
        updateMany: async () => {
          updateManyCalled = true;
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "compare",
      source: "repair",
    });

    expect(result.pricing.archived).toBe(1);
    expect(updateManyCalled).toBe(false);
  });

  it("sync mode soft-archives active generic pricing for dependenciesUid = variant.uid", async () => {
    let archivedIds: number[] = [];

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-arch-2",
          status: "archived",
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
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [
          { id: 701, dependenciesUid: "var-arch-2" },
        ],
        updateMany: async (args: any) => {
          archivedIds = args?.where?.id?.in ?? [];
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-form",
    });

    expect(result.pricing.archived).toBe(1);
    expect(archivedIds).toContain(701);
  });

  it("archived variant does not create new pricing rows", async () => {
    let createCalled = false;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-arch-3",
          status: "archived",
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
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [],
        updateMany: async () => ({ count: 0 }),
        create: async () => {
          createCalled = true;
          return { id: 999 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-form",
    });

    expect(result.pricing.created).toBe(0);
    expect(result.pricing.archived).toBe(0);
    expect(createCalled).toBe(false);
  });

  it("archived via deletedAt also triggers archive", async () => {
    let archivedCount = 0;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-del-1",
          status: "published",
          deletedAt: new Date(),
          inventoryId: 1,
          inventory: {
            uid: "prod-uid-1",
            inventoryCategoryId: 5,
            sourceStepUid: null,
            sourceComponentUid: null,
            inventoryCategory: { uid: "step-uid-1" },
          },
          pricing: null,
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [
          { id: 702, dependenciesUid: "var-del-1" },
        ],
        updateMany: async () => {
          archivedCount += 1;
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-form",
    });

    expect(result.pricing.archived).toBe(1);
    expect(result.pricing.created).toBe(0);
  });
});

// ---- Draft variant tests (Pending 01 Fix) ----

describe("syncInventoryToDyke draft variant", () => {
  it("draft variant does not create or update active pricing", async () => {
    let createCalled = false;
    let updateCalled = false;

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-draft-1",
          status: "draft",
          deletedAt: null,
          inventoryId: 1,
          inventory: {
            uid: "prod-uid-1",
            inventoryCategoryId: 5,
            sourceStepUid: null,
            sourceComponentUid: null,
            inventoryCategory: { uid: "step-uid-1" },
          },
          pricing: { id: 50, price: 100.0, costPrice: 90.0 },
          supplierVariants: [],
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
        updateMany: async () => {
          updateCalled = true;
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-form",
    });

    expect(result.pricing.created).toBe(0);
    expect(result.pricing.updated).toBe(0);
    expect(createCalled).toBe(false);
    expect(updateCalled).toBe(false);
    expect(result.pricing.skipped.length).toBeGreaterThanOrEqual(1);
    expect(result.pricing.skipped[0]!.reason).toBe("variant_not_published");
  });
});

// ---- Supplier pricing archive tests (Pending 01 Fix) ----

describe("syncInventoryToDyke supplier pricing archive", () => {
  it("archives supplier pricing row matching preserved meta.pricingKey", async () => {
    let archivedIds: number[] = [];

    const db = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-arch-sup-1",
          status: "archived",
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
          { id: 800, dependenciesUid: "36x80 & SUP1" },
        ],
        updateMany: async (args: any) => {
          archivedIds = args?.where?.id?.in ?? [];
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const result = await syncInventoryToDyke(db, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "supplier-variant",
    });

    expect(result.pricing.archived).toBeGreaterThanOrEqual(1);
    expect(archivedIds).toContain(800);
  });
});

// ---- updateVariantStatus queue tests (Fix 2) ----

describe("updateVariantStatus queue", () => {
  beforeEach(() => {
    (tasks as any).trigger = mock(async () => ({ id: "test-run" }));
  });

  it("queues sync-inventory-to-dyke after updating an existing variant", async () => {
    const db = {
      inventoryVariant: {
        update: async () => ({}),
        create: async () => ({ id: 0 }),
      },
    } as unknown as Db;

    await updateVariantStatus(db, {
      status: "archived",
      variantId: 42,
      inventoryId: 99,
      uid: "var-uid-1",
    });

    expect(tasks.trigger).toHaveBeenCalledTimes(1);
    expect(tasks.trigger).toHaveBeenCalledWith("sync-inventory-to-dyke", {
      inventoryCategoryId: null,
      inventoryId: 99,
      inventoryVariantId: 42,
      mode: "sync",
      source: "variant-form",
    });
  });

  it("queues sync-inventory-to-dyke with created variant id after creating a new variant", async () => {
    const db = {
      inventoryVariant: {
        update: async () => ({}),
        create: async () => ({ id: 77 }),
      },
    } as unknown as Db;

    await updateVariantStatus(db, {
      status: "published",
      variantId: null,
      inventoryId: 99,
      uid: "var-uid-new",
    } as any);

    expect(tasks.trigger).toHaveBeenCalledTimes(1);
    expect(tasks.trigger).toHaveBeenCalledWith("sync-inventory-to-dyke", {
      inventoryCategoryId: null,
      inventoryId: 99,
      inventoryVariantId: 77,
      mode: "sync",
      source: "variant-form",
    });
  });
});

// ---- Variant archive idempotency test (Fix 2) ----

describe("syncInventoryToDyke variant archive idempotency", () => {
  it("repeated archive sync reports zero when active rows are already gone", async () => {
    // First sync: active rows exist, archive them
    let firstSyncArchiveCount = 0;

    const dbForFirstSync = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-arch-idem-1",
          status: "archived",
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
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [
          { id: 900, dependenciesUid: "var-arch-idem-1" },
        ],
        updateMany: async () => {
          firstSyncArchiveCount += 1;
          return { count: 1 };
        },
      },
    } as unknown as Db;

    const firstResult = await syncInventoryToDyke(dbForFirstSync, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-form",
    });

    expect(firstResult.pricing.archived).toBe(1);

    // Second sync: pricing rows already archived, findMany returns empty
    let secondSyncArchiveCount = 0;

    const dbForSecondSync = {
      inventoryVariant: {
        findUnique: async () => ({
          id: 10,
          uid: "var-arch-idem-1",
          status: "archived",
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
          supplierVariants: [],
          attributes: [],
        }),
      },
      dykeSteps: {
        findFirst: async () => ({ id: 200 }),
      },
      dykePricingSystem: {
        findMany: async () => [],
        updateMany: async () => {
          secondSyncArchiveCount += 1;
          return { count: 0 };
        },
      },
    } as unknown as Db;

    const secondResult = await syncInventoryToDyke(dbForSecondSync, {
      inventoryVariantId: 10,
      mode: "sync",
      source: "variant-form",
    });

    expect(secondResult.pricing.archived).toBe(0);
    expect(secondSyncArchiveCount).toBe(0);
  });
});
