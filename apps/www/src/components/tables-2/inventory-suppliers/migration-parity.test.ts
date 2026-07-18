import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Inventory Suppliers table migration parity", () => {
	it("renders through the restarted route shell with hydrated table settings", () => {
		const routeSource = readSource(
			"app/(sidebar)/inventory/suppliers/page.tsx",
		);

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("HydrateClient")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			routeSource.includes('getInitialTableSettings("inventory-suppliers")'),
		).toBe(true);
		expect(routeSource.includes("InventorySuppliersSkeleton")).toBe(true);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
	});

	it("keeps the supplier manager off the old item-list table surface", () => {
		const source = readSource(
			"components/inventory/inventory-suppliers-manager.tsx",
		);

		expect(
			source.includes("components/tables-2/inventory-suppliers/data-table"),
		).toBe(true);
		expect(source.includes("InventorySuppliersColumnVisibility")).toBe(true);
		expect(source.includes("ItemGroup")).toBe(false);
		expect(source.includes("DropdownMenu")).toBe(false);
		expect(source.includes("rounded-xl border border-dashed")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize state, and supplier actions", () => {
		const source = readSource(
			"components/tables-2/inventory-suppliers/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/inventory-suppliers/columns.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="inventory-suppliers-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(columnsSource.includes("onSetDefault")).toBe(true);
		expect(columnsSource.includes("onEdit(supplier)")).toBe(true);
		expect(columnsSource.includes("onDelete(supplier)")).toBe(true);
	});

	it("keeps compact headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/inventory-suppliers/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("HorizontalPagination")).toBe(true);
		expect(source.includes("getTableCellPaddingClass(tableConfig.style)")).toBe(
			true,
		);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("registers compact tailored inventory supplier widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/inventory-suppliers/columns.tsx",
		);

		expect(settingsSource.includes('| "inventory-suppliers"')).toBe(true);
		expect(configSource.includes('"inventory-suppliers": {')).toBe(true);
		expect(configSource.includes('tableId: "inventory-suppliers"')).toBe(true);
		expect(configSource.includes('id: "supplier"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(170, 280, 210)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(92, 120, 104)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
