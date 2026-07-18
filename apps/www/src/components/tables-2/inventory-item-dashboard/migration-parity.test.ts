import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Inventory item dashboard table migration parity", () => {
	it("renders through the restarted route shell with hydrated table settings", () => {
		const routeSource = readSource("app/(sidebar)/inventory/[id]/page.tsx");

		expect(routeSource.includes("PageShell")).toBe(true);
		expect(routeSource.includes("HydrateClient")).toBe(true);
		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(routeSource.includes("INVENTORY_ITEM_DASHBOARD_TABLE_IDS")).toBe(
			true,
		);
		expect(routeSource.includes("getInitialTableSettings(tableId)")).toBe(true);
		expect(routeSource.includes("InventoryProductsSkeleton")).toBe(true);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes(".fetchQuery(")).toBe(false);
	});

	it("replaces hand-rendered dashboard list sections with table-core sections", () => {
		const source = readSource(
			"components/inventory/inventory-item-dashboard-page.tsx",
		);

		expect(
			source.includes("components/tables-2/inventory-item-dashboard"),
		).toBe(true);
		expect(source.includes("InventoryItemDashboardDataTable")).toBe(true);
		expect(source.includes("InventoryItemDashboardColumnVisibility")).toBe(
			true,
		);
		expect(source.includes("VariantGrid")).toBe(false);
		expect(source.includes("StockTable")).toBe(false);
		expect(source.includes("MovementTable")).toBe(false);
		expect(source.includes("InboundTable")).toBe(false);
		expect(source.includes("AllocationTable")).toBe(false);
		expect(source.includes("RelatedLines")).toBe(false);
		expect(source.includes("rows.map((row) => (")).toBe(false);
		expect(source.includes("variants.map((variant) => (")).toBe(false);
		expect(source.includes("rounded-md border border-dashed")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, virtualization, resize, and compact headers", () => {
		const tableSource = readSource(
			"components/tables-2/inventory-item-dashboard/data-table.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-item-dashboard/table-header.tsx",
		);

		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(tableSource.includes("useTableDnd(table)")).toBe(true);
		expect(tableSource.includes("<DndContext")).toBe(true);
		expect(tableSource.includes("collisionDetection={closestCenter}")).toBe(
			true,
		);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(tableSource.includes("enableColumnResizing: true")).toBe(true);
		expect(tableSource.includes("onColumnSizingChange: setColumnSizing")).toBe(
			true,
		);
		expect(tableSource.includes("onColumnOrderChange: setColumnOrder")).toBe(
			true,
		);
		expect(
			tableSource.includes("estimateSize: () => tableConfig.rowHeight"),
		).toBe(true);
		expect(tableSource.includes("rowHeight={tableConfig.rowHeight}")).toBe(
			true,
		);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("HorizontalPagination")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(
			headerSource.includes("getTableCellPaddingClass(tableConfig.style)"),
		).toBe(true);
	});

	it("registers compact content-fit table ids for every dashboard section", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/inventory-item-dashboard/columns.tsx",
		);

		for (const tableId of [
			"inventory-item-variants",
			"inventory-item-stocks",
			"inventory-item-movements",
			"inventory-item-inbound-demands",
			"inventory-item-allocations",
			"inventory-item-related-lines",
		]) {
			expect(settingsSource.includes(`| "${tableId}"`)).toBe(true);
			expect(configSource.includes(`"${tableId}": {`)).toBe(true);
			expect(configSource.includes(`tableId: "${tableId}"`)).toBe(true);
		}

		expect(configSource.includes("rowHeight: 72")).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(200, 340, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(150, 220, 170)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(160, 260, 190)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(150, 240, 170)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
