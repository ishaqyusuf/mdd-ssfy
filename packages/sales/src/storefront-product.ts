import { Db } from "@gnd/db";
import { GetStoreAddonComponentForm } from "./schema";

export async function getStoreAddonComponentForm(
  db: Db,
  data: GetStoreAddonComponentForm
) {
  const inventory = await db.inventory.findUniqueOrThrow({
    where: {
      id: data.inventoryId,
    },
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
                    where: { deletedAt: null, status: "published" },
                    select: {
                      id: true,
                      defaultInventoryId: true,
                      status: true,
                      index: true,
                      required: true,
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
  });
  const subComponentInventory = inventory.inventoryItemSubCategories.find(
    (a) => a.value?.inventory.subComponents.length
  )?.value?.inventory;
  return {
    subComponentInventory,
  };
}
