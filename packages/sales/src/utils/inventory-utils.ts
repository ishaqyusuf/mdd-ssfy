export const inventoryCategoryTypes = ["shelf-item"] as const;
export type InventoryCategoryTypes = (typeof inventoryCategoryTypes)[number];
export const generateInventoryCategoryUidFromShelfCategoryId = (id) =>
  `shelf-${id}`;
