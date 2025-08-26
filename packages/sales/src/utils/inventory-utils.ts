import { uniqueList } from "@gnd/utils";
import { Prisma } from "../types";

export const inventoryCategoryTypes = ["shelf-item"] as const;
export type InventoryCategoryTypes = (typeof inventoryCategoryTypes)[number];
export const generateInventoryCategoryUidFromShelfCategoryId = (id) =>
  `shelf-${id}`;

export function composeInventorySubCategories(
  list: Prisma.InventoryItemSubCategoryGetPayload<{
    select: {
      inventory: {
        select: {
          id: true;
          name: true;
        };
      };
      value: {
        select: {
          inventory: {
            select: {
              id: true;
              name: true;
              inventoryCategory: {
                select: {
                  title: true;
                  id: true;
                };
              };
            };
          };
        };
      };
    };
  }>[]
) {
  const subCategories = list.map((a) => a.value?.inventory);
  return uniqueList(
    subCategories.map((c) => ({
      id: c?.inventoryCategory?.id,
      label: c?.inventoryCategory?.title,
      items: uniqueList(
        subCategories
          .filter((a) => a?.inventoryCategory?.id === c?.inventoryCategory?.id)
          .map((a) => ({
            id: a?.id,
            name: a?.name,
          })),
        "id"
      ),
    })),
    "id"
  );
}
