import type { TRPCContext } from "@api/trpc/init";
import type { StepMeta } from "@api/type";

export async function getDykeStep(ctx: TRPCContext, stepId) {
  const step = await ctx.db.dykeSteps.findUniqueOrThrow({
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
  return {
    ...step,
    meta: step.meta as StepMeta,
  };
}
export async function getStepProducts(ctx: TRPCContext, dykeStepId) {
  // await ctx.db.squarePaymentOrders.
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
export async function getProductsByUids(
  ctx: TRPCContext,
  productUids: string[]
) {
  if (!productUids.length) return [];
  const products = await ctx.db.dykeStepProducts.findMany({
    where: {
      uid: {
        in: productUids,
      },
    },
    select: {
      uid: true,
      name: true,
      img: true,
      step: {
        select: {
          uid: true,
          id: true,
          title: true,
        },
      },
    },
  });
  return products;
}
export async function getStepsByUids(ctx: TRPCContext, stepUids: string[]) {
  const steps = await ctx.db.dykeSteps.findMany({
    where: {
      uid: {
        in: stepUids,
      },
    },
    select: {
      uid: true,
      id: true,
      title: true,
    },
  });
  return steps;
}
