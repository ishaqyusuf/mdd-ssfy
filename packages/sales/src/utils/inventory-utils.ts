export const inventoryTypeTypes = ["shelf-item"] as const;
export const generateInventoryTypeUidFromShelfCategoryId = (id) =>
  `shelf-${id}`;
