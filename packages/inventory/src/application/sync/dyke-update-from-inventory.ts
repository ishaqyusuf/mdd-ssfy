import type { Db } from "@gnd/db";

export type DykeUpdateFromInventoryInput = {
  inventoryCategoryId?: number | null;
  inventoryId?: number | null;
  syncTitle?: boolean;
  syncImage?: boolean;
};

export async function dykeUpdateFromInventory(
  db: Db,
  input: DykeUpdateFromInventoryInput,
) {
  const syncTitle = input.syncTitle ?? true;
  const syncImage = input.syncImage ?? true;
  const summary = {
    categoryUpdated: 0,
    productsUpdated: 0,
    skipped: [] as string[],
  };

  if (input.inventoryCategoryId) {
    const category = await db.inventoryCategory.findUnique({
      where: { id: input.inventoryCategoryId },
      select: { id: true, uid: true, title: true },
    });

    if (!category?.uid) {
      summary.skipped.push("inventory category missing uid");
    } else {
      await db.dykeSteps.updateMany({
        where: { uid: category.uid },
        data: syncTitle ? { title: category.title } : {},
      });
      summary.categoryUpdated += 1;
    }
  }

  if (input.inventoryId) {
    const inventory = await db.inventory.findUnique({
      where: { id: input.inventoryId },
      select: {
        id: true,
        uid: true,
        name: true,
        images: {
          where: { deletedAt: null, primary: true },
          take: 1,
          select: {
            imageGallery: {
              select: { path: true },
            },
          },
        },
      },
    });

    if (!inventory?.uid) {
      summary.skipped.push("inventory product missing uid");
    } else {
      await db.dykeStepProducts.updateMany({
        where: { uid: inventory.uid },
        data: {
          ...(syncTitle ? { name: inventory.name } : {}),
          ...(syncImage
            ? { img: inventory.images[0]?.imageGallery?.path ?? undefined }
            : {}),
        },
      });
      summary.productsUpdated += 1;
    }
  }

  return summary;
}
