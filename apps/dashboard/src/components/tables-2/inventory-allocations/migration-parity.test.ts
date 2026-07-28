import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Inventory Allocations Sales Orders table migration parity", () => {
	it("keeps the allocations route on the restarted table shell", () => {
		const routeSource = readSource(
			"app/(sidebar)/inventory/allocations/page.tsx",
		);
		const pageSource = readSource(
			"components/inventory/inventory-allocation-review-page.tsx",
		);
		const source = `${routeSource}\n${pageSource}`;

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(routeSource.includes("getInitialTableSettings(")).toBe(true);
		expect(routeSource.includes('"inventory-allocations"')).toBe(true);
		expect(source.includes("InventoryAllocationsColumnVisibility")).toBe(true);
		expect(source.includes("InventoryAllocationsSkeleton")).toBe(true);
		expect(
			source.includes("components/tables-2/inventory-allocations/data-table"),
		).toBe(true);
		expect(source.includes("components/tables/skeleton")).toBe(false);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
		expect(source.includes("IntersectionObserver")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, persisted settings, and selection", () => {
		const source = readSource(
			"components/tables-2/inventory-allocations/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="inventory-allocations-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact allocation widths and table settings registration", () => {
		const columnsSource = readSource(
			"components/tables-2/inventory-allocations/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-allocations/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(240, 480, 300)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(260, 520, 340)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(168, 210, 184)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("tableConfig.nonReorderableColumns")).toBe(
			true,
		);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "inventory-allocations"')).toBe(true);
		expect(
			settingsSource.includes('"inventory-allocations": ["references"]'),
		).toBe(true);
		expect(configSource.includes('"inventory-allocations": {')).toBe(true);
		expect(configSource.includes('tableId: "inventory-allocations"')).toBe(
			true,
		);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
