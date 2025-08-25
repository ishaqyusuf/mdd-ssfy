import { Db } from "@gnd/db";
import { GetStoreAddonComponentForm } from "./schema";

export async function getStoreAddonComponentForm(
  db: Db,
  data: GetStoreAddonComponentForm
) {
  const variant = await db.inventoryVariant.findUniqueOrThrow({
    where: {
      id: data.variantId,
    },
    select: {
      inventory: {
        select: {
          inventoryItemSubCategories: {
            where: { deletedAt: null },
            select: {
              value: {
                where: { deletedAt: null },
                select: {
                  inventory: {
                    select: {
                      subComponents: {
                        where: { deletedAt: null },
                        select: {
                          defaultInventoryId: true,
                          status: true,
                          index: true,
                          inventoryCategory: {
                            select: {
                              title: true,
                              id: true,
                            },
                          },
                        },
                        orderBy: {
                          index: "asc",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const subComponentInventory =
    variant.inventory.inventoryItemSubCategories.find(
      (a) => a.value?.inventory.subComponents.length
    )?.value?.inventory;
  return {
    subComponentInventory,
  };
}
