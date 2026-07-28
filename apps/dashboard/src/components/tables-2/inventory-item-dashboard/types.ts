import type { TableId } from "@/utils/table-settings";

export const INVENTORY_ITEM_DASHBOARD_TABLE_IDS = [
	"inventory-item-variants",
	"inventory-item-stocks",
	"inventory-item-movements",
	"inventory-item-inbound-demands",
	"inventory-item-allocations",
	"inventory-item-related-lines",
] as const satisfies readonly TableId[];

export type InventoryItemDashboardTableId =
	(typeof INVENTORY_ITEM_DASHBOARD_TABLE_IDS)[number];
