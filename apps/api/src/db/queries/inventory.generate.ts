import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";
import {
  getDykeStep,
  getProductsByUids,
  getStepPricings,
  getStepProducts,
} from "./dyke";

export async function generateInventoryForDykeStep(ctx: TRPCContext, stepId) {
  const dyke = await getDykeStep(ctx, stepId);
  const products = await getStepProducts(ctx, stepId);
  const pricings = await getStepPricings(ctx, stepId);
  const dependenciesUids: string[] = Array.from(
    new Set(pricings.map((p) => p.dependenciesUid?.split("-")?.flat()).flat()),
  ).filter(Boolean) as any;
  const dependencyProducts = await getProductsByUids(ctx, dependenciesUids);
  // i want to generate inventory for each product in the dyke step

  // inventoryType = dykestep
  // inventory = dykeProduct
  // inventory variant =
}

export const querySchemaType = z.object({
  stepId: z.number(),
});
