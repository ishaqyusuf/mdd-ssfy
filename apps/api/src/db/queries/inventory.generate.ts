import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";
import {
  getDykeStep,
  getProductsByUids,
  getStepPricings,
  getStepProducts,
  getStepsByUids,
} from "./dyke";
import {
  createInventoryType,
  upsertInventoriesForDykeProducts,
} from "./inventory";

export async function generateInventoryForDykeStep(ctx: TRPCContext, stepId) {
  const dyke = await getDykeStep(ctx, stepId);
  const products = await getStepProducts(ctx, stepId);
  const pricings = await getStepPricings(ctx, stepId);
  //dependenciesUid == null, default variant
  //dependenciesUid contains " x " dimension;
  const dependenciesUids: string[] = Array.from(
    new Set(
      pricings
        .map((p) =>
          p.dependenciesUid?.includes(" x ")
            ? p.dependenciesUid
            : p.dependenciesUid?.split("-")?.flat(),
        )
        .flat(),
    ),
  ).filter(Boolean) as any;
  const nonDimensionDeps = dependenciesUids.filter((a) => !a?.includes(" x "));
  const dimensionDeps = dependenciesUids.filter((a) => a?.includes(" x "));
  const dependencyProducts = await getProductsByUids(ctx, nonDimensionDeps);
  dimensionDeps?.map((dd) => {
    dependencyProducts.push({
      name: dd,
      uid: dd,
      img: "",
      step: {
        id: -1,
        title: "Dimension",
        uid: "dimension",
      },
    });
  });
  // i want to generate inventory for each product in the dyke step
  const stepDepsUids = dyke?.meta?.priceStepDeps?.filter(Boolean) || [];
  const steps = await getStepsByUids(ctx, stepDepsUids);
  // const inventoryTypes = await ctx.db.inventoryType.
  steps
    .filter((s) => !dependencyProducts.find((a) => a.step?.uid === s.uid))
    .map((step) => {
      dependencyProducts.push({
        step,
      } as any);
    });
  const { inventories: depInventories, inventoryTypes } =
    await upsertInventoriesForDykeProducts(ctx, {
      products: dependencyProducts as any,
    });
  const inventoryType = await createInventoryType(ctx, {
    name: dyke.title as any,
    uid: dyke?.uid as any,
    attributes: steps
      .map((step) => {
        const inventoryTypeId = inventoryTypes.find((t) => t.uid === step.uid)
          ?.id as any;
        return {
          inventoryTypeId,
        };
      })
      .filter(Boolean),
  });
  await ctx.db.inventory.createMany({
    data: products.map((prod) => ({
      uid: prod.uid as any,
      img: prod.img as any,
      title: prod.name as any,
      typeId: inventoryType.id,
    })),
  });
  const inventories = await ctx.db.inventory.findMany({
    where: {
      uid: {
        in: products.map((a) => a.uid).filter(Boolean) as any,
      },
    },
    select: {
      uid: true,
      img: true,
      id: true,
    },
  });

  for (const pricing of pricings) {
    const productsDepsUids = pricing.dependenciesUid?.includes(" x ")
      ? [pricing.dependenciesUid]
      : pricing.dependenciesUid?.split("-") || [];
    const [firstUid] = productsDepsUids;
    const inventory = inventories.find((i) => pricing.stepProductUid == i.uid);
    if (!inventory) continue;
    if (!firstUid) productsDepsUids.push(inventory.uid);
    const deps = depInventories.filter((a) => productsDepsUids.includes(a.uid));
  }
}

export const querySchemaType = z.object({
  stepId: z.number(),
});
