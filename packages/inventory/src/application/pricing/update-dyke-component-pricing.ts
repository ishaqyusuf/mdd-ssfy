import type { Db } from "@gnd/db";
import type { UpdateDykeComponentPricing } from "../../schema";

export async function updateDykeComponentPricing(
  db: Db,
  input: UpdateDykeComponentPricing,
) {
  const updateByPrice: Record<string, number[]> = {};
  const deleteIds: number[] = [];

  for (const pricing of input.pricings.filter((item) => item.id)) {
    if (!pricing.id) continue;

    if (pricing.price == null || Number.isNaN(Number(pricing.price))) {
      deleteIds.push(pricing.id);
      continue;
    }

    const key = String(pricing.price);
    if (!updateByPrice[key]) updateByPrice[key] = [];
    updateByPrice[key]!.push(pricing.id);
  }

  let updatedCount = 0;
  for (const [price, ids] of Object.entries(updateByPrice)) {
    const result = await db.dykePricingSystem.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        price: Number(price),
      },
    });
    updatedCount += result.count;
  }

  let deletedCount = 0;
  if (deleteIds.length) {
    const result = await db.dykePricingSystem.updateMany({
      where: {
        id: {
          in: deleteIds,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });
    deletedCount = result.count;
  }

  const newData = input.pricings
    .filter((item) => !item.id && item.price != null)
    .map(({ id, ...rest }) => rest);

  let createdCount = 0;
  if (newData.length) {
    const result = await db.dykePricingSystem.createMany({
      data: newData.map((pricing) => ({
        ...pricing,
        price: Number(pricing.price),
        dykeStepId: input.stepId,
        stepProductUid: input.stepProductUid,
      })),
    });
    createdCount = result.count;
  }

  return {
    stepId: input.stepId,
    stepProductUid: input.stepProductUid,
    createdCount,
    updatedCount,
    deletedCount,
    syncRequested: input.triggerInventorySync ?? true,
  };
}
