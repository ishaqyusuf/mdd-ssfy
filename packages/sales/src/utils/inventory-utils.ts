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
export function composeVariantAttributeDisplay(
  attrs: Prisma.InventoryVariantAttributeGetPayload<{
    select: {
      inventoryCategoryVariantAttribute: {
        select: {
          inventoryCategory: {
            select: {
              title: true;
            };
          };
        };
      };
      value: {
        select: {
          name: true;
        };
      };
    };
  }>[]
) {
  let width: any = null;
  let height: any = null;
  return attrs
    .map((a) => {
      const label =
        a.inventoryCategoryVariantAttribute?.inventoryCategory.title;
      const value = a.value?.name;
      if (label?.toLocaleLowerCase() == "width") width = value;
      if (label?.toLocaleLowerCase() == "height") height = value;
      return {
        label,
        value,
      };
    })
    .filter((a) => (width && height ? a.label != "height" : false))
    .map((b) => {
      if (b?.label?.toLowerCase() === "width" && width && height) {
        b.label = "Size";
        b.value = `${width} x ${height}`;
      }
      return b;
    });
}
