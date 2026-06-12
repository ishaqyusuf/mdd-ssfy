import type { Db } from "@gnd/db";
import type { DykeInventoryDriftReport } from "../../schema";

export async function getDykeInventoryDriftReport(
  db: Db,
  input: DykeInventoryDriftReport,
) {
  const isNonEmptyString = (value: string | null): value is string => !!value;

  // ---- Existing structural drift ----
  const components = await db.dykeStepProducts.findMany({
    where: {
      deletedAt: null,
      ...(input.stepId ? { dykeStepId: input.stepId } : {}),
    },
    select: {
      id: true,
      uid: true,
      name: true,
      img: true,
      dykeStepId: true,
    },
  });

  const uids = components
    .map((component) => component.uid)
    .filter(isNonEmptyString);
  const [inventories, variants] = await Promise.all([
    db.inventory.findMany({
      where: {
        uid: { in: uids },
        deletedAt: null,
      },
      select: {
        id: true,
        uid: true,
        name: true,
        deletedAt: true,
        inventoryCategoryId: true,
      },
    }),
    db.inventoryVariant.findMany({
      where: { uid: { in: uids } },
      select: { id: true, uid: true },
    }),
  ]);

  const inventoryUidSet = new Set(inventories.map((i) => i.uid));
  const variantUidSet = new Set(variants.map((v) => v.uid));

  const missingInventory = components.filter(
    (c) => !c.uid || !inventoryUidSet.has(c.uid),
  );
  const missingVariant = components.filter(
    (c) => !c.uid || !variantUidSet.has(c.uid),
  );

  // -- Resolve step ID to step UID for correct cross-table filtering --
  let stepUid: string | null = null;
  if (input.stepId) {
    const step = await db.dykeSteps.findUnique({
      where: { id: input.stepId },
      select: { uid: true },
    });
    stepUid = step?.uid ?? null;
  }

  // ---- Inventory-origin drift: categories ----
  const inventoryCategories = await db.inventoryCategory.findMany({
    where: {
      deletedAt: null,
      ...(stepUid
        ? { uid: stepUid }
        : {}),
    },
    select: {
      id: true,
      uid: true,
      title: true,
      deletedAt: true,
    },
  });

  const categoryUids = inventoryCategories
    .map((c) => c.uid)
    .filter(isNonEmptyString);

  const dykeSteps = await db.dykeSteps.findMany({
    where: {
      uid: { in: categoryUids },
      deletedAt: null,
    },
    select: {
      id: true,
      uid: true,
      title: true,
    },
  });

  const dykeStepUidSet = new Set(dykeSteps.map((s) => s.uid));

  const categoriesMissingInDyke = inventoryCategories.filter(
    (c) => c.uid && !dykeStepUidSet.has(c.uid),
  );
  const categoryTitleMismatches = inventoryCategories
    .filter((c) => c.uid && dykeStepUidSet.has(c.uid))
    .map((c) => {
      const dyke = dykeSteps.find((s) => s.uid === c.uid);
      return dyke && dyke.title !== c.title
        ? { inventoryCategoryId: c.id, uid: c.uid, inventoryTitle: c.title, dykeTitle: dyke.title }
        : null;
    })
    .filter(Boolean);

  // Collect inventory category IDs that match the resolved step UID
  const matchedCategoryIds = inventoryCategories.map((c) => c.id);

  // ---- Inventory-origin drift: products (inventory -> dyke direction) ----
  const inventoryProducts = await db.inventory.findMany({
    where: {
      deletedAt: null,
      ...(stepUid
        ? { inventoryCategoryId: { in: matchedCategoryIds } }
        : {}),
    },
    select: {
      id: true,
      uid: true,
      name: true,
      status: true,
      deletedAt: true,
      inventoryCategoryId: true,
      inventoryCategory: {
        select: { uid: true, title: true },
      },
    },
    take: 200,
  });

  const productUids = inventoryProducts
    .map((p) => p.uid)
    .filter(isNonEmptyString);

  const dykeStepProducts = await db.dykeStepProducts.findMany({
    where: {
      uid: { in: productUids },
      deletedAt: null,
    },
    select: {
      id: true,
      uid: true,
      name: true,
      img: true,
      dykeStepId: true,
    },
  });

  const dykeProductUidSet = new Set(dykeStepProducts.map((p) => p.uid));

  const productsMissingInDyke = inventoryProducts.filter(
    (p) => p.uid && !dykeProductUidSet.has(p.uid),
  );
  const productTitleMismatches = inventoryProducts
    .filter((p) => p.uid && dykeProductUidSet.has(p.uid))
    .map((p) => {
      const dyke = dykeStepProducts.find((dp) => dp.uid === p.uid);
      return dyke && dyke.name !== p.name
        ? { inventoryId: p.id, uid: p.uid, inventoryName: p.name, dykeName: dyke.name }
        : null;
    })
    .filter(Boolean);

  // ---- Pricing drift: compare DykePricingSystem against inventory variant pricing ----
  const pricingMismatches: Array<{
    dykePricingId: number;
    stepProductUid: string;
    dependenciesUid: string | null;
    dykePrice: number;
    expectedPrice: number | null;
  }> = [];

  const inventoryPricingRows = await db.inventoryVariantPricing.findMany({
    where: {
      deletedAt: null,
      inventoryVariant: {
        inventory: {
          uid: { in: productUids },
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      price: true,
      costPrice: true,
      inventoryVariantId: true,
      inventoryVariant: {
        select: {
          uid: true,
          inventory: {
            select: { uid: true },
          },
        },
      },
    },
  });

  // Map variant UID -> expected price
  const variantPriceMap = new Map<string, { price: number; variantUid: string; productUid: string }>();
  for (const ip of inventoryPricingRows) {
    const variantUid = ip.inventoryVariant?.uid;
    const productUid = ip.inventoryVariant?.inventory?.uid;
    const price = ip.price ?? ip.costPrice ?? null;
    if (variantUid && productUid && price != null) {
      variantPriceMap.set(variantUid, { price, variantUid, productUid });
    }
  }

  if (variantPriceMap.size > 0) {
    const variantUids = Array.from(variantPriceMap.keys());
    const affectedDykePricings = await db.dykePricingSystem.findMany({
      where: {
        stepProductUid: { in: productUids },
        deletedAt: null,
      },
      select: {
        id: true,
        stepProductUid: true,
        dependenciesUid: true,
        price: true,
      },
      take: 200,
    });

    for (const dp of affectedDykePricings) {
      const depsUid = dp.dependenciesUid ?? "";
      // Try matching by variant UID (the dependenciesUid in generic pricing)
      const expected = variantPriceMap.get(depsUid);
      if (expected && Math.abs(dp.price - expected.price) > 0.001) {
        pricingMismatches.push({
          dykePricingId: dp.id,
          stepProductUid: dp.stepProductUid,
          dependenciesUid: dp.dependenciesUid ?? null,
          dykePrice: dp.price,
          expectedPrice: expected.price,
        });
      }
    }
  }

  return {
    stepId: input.stepId ?? null,
    totals: {
      components: components.length,
      missingInventory: missingInventory.length,
      missingVariant: missingVariant.length,
      categoriesMissingInDyke: categoriesMissingInDyke.length,
      categoryTitleMismatches: categoryTitleMismatches.length,
      productsMissingInDyke: productsMissingInDyke.length,
      productTitleMismatches: productTitleMismatches.length,
      pricingMismatches: pricingMismatches.length,
    },
    missingInventory,
    missingVariant,
    categoriesMissingInDyke,
    categoryTitleMismatches,
    productsMissingInDyke,
    productTitleMismatches,
    pricingMismatches,
  };
}
