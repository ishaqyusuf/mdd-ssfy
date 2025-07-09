import type { TRPCContext } from "@api/trpc/init";

export async function getDykeStep(ctx: TRPCContext, stepId) {
  const step = await ctx.db.dykeSteps.findFirst({
    where: {
      id: stepId,
    },
    select: {
      uid: true,
      id: true,
      title: true,
      meta: true,
    },
  });
}
export async function getStepProducts(ctx: TRPCContext, dykeStepId) {
  const products = await ctx.db.dykeStepProducts.findMany({
    where: {
      dykeStepId,
    },
    select: {
      id: true,
      uid: true,
      img: true,
      name: true,
      meta: true,
    },
  });
  return products;
}
export async function getStepPricings(ctx: TRPCContext, dykeStepId) {
  const pricings = await ctx.db.dykePricingSystem.findMany({
    where: {
      dykeStepId,
    },
    select: {
      stepProductUid: true,
      dependenciesUid: true,
      price: true,
    },
  });
  return pricings;
}
export async function getProductsByUids(ctx: TRPCContext, productUids) {
  const products = await ctx.db.dykeStepProducts.findMany({
    where: {
      uid: {
        in: productUids,
      },
    },
    select: {
      uid: true,
      step: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  return products;
}
