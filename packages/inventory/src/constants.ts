export const STOCK_MODES = ["monitored", "unmonitored"] as const;
export type StockModes = (typeof STOCK_MODES)[number];

export const INVENTORY_STATUS = ["draft", "published", "archived"] as const;
export type INVENTORY_STATUS = (typeof INVENTORY_STATUS)[number];

export const IMPORT_STRATEGIES = ["handcrafted", "optimized"] as const;
export type InventoryImportStrategyName = (typeof IMPORT_STRATEGIES)[number];

export const IMPORT_RUN_SOURCES = ["manual", "event", "job"] as const;
export type InventoryImportRunSource = (typeof IMPORT_RUN_SOURCES)[number];
