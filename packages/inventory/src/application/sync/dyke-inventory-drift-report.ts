import type { Db } from "@gnd/db";
import type { DykeInventoryDriftReport } from "../../schema";

export async function getDykeInventoryDriftReport(
  db: Db,
  input: DykeInventoryDriftReport,
) {
  const isNonEmptyString = (value: string | null): value is string => !!value;
  const components = await db.dykeStepProducts.findMany({
    where: {
      deletedAt: null,
      ...(input.stepId ? { dykeStepId: input.stepId } : {}),
    },
    select: {
      id: true,
      uid: true,
      name: true,
      dykeStepId: true,
    },
  });

  const uids = components
    .map((component) => component.uid)
    .filter(isNonEmptyString);
  const [inventories, variants] = await Promise.all([
    db.inventory.findMany({
      where: {
        uid: {
          in: uids,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        uid: true,
      },
    }),
    db.inventoryVariant.findMany({
      where: {
        uid: {
          in: uids,
        },
      },
      select: {
        id: true,
        uid: true,
      },
    }),
  ]);

  const inventoryUidSet = new Set(inventories.map((inventory) => inventory.uid));
  const variantUidSet = new Set(variants.map((variant) => variant.uid));

  const missingInventory = components.filter(
    (component) => !component.uid || !inventoryUidSet.has(component.uid),
  );
  const missingVariant = components.filter(
    (component) => !component.uid || !variantUidSet.has(component.uid),
  );

  return {
    stepId: input.stepId ?? null,
    totals: {
      components: components.length,
      missingInventory: missingInventory.length,
      missingVariant: missingVariant.length,
    },
    missingInventory,
    missingVariant,
  };
}
