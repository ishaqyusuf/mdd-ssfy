import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Door Suppliers table migration parity", () => {
	it("keeps the supplier chooser off the legacy data-table package", () => {
		const source = readSource("components/forms/sales-form/door-suppliers.tsx");

		expect(
			source.includes("components/tables-2/door-suppliers/data-table"),
		).toBe(true);
		expect(source.includes("DoorSuppliersColumnVisibility")).toBe(true);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes('<Table className="table-sm">')).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and row select behavior", () => {
		const source = readSource(
			"components/tables-2/door-suppliers/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="door-suppliers-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("onSelect(supplier)")).toBe(true);
		expect(source.includes("clamp(180px")).toBe(true);
	});

	it("keeps compact headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/door-suppliers/table-header.tsx",
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

	it("registers compact tailored supplier widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/door-suppliers/columns.tsx",
		);

		expect(settingsSource.includes('| "door-suppliers"')).toBe(true);
		expect(configSource.includes('"door-suppliers": {')).toBe(true);
		expect(configSource.includes('tableId: "door-suppliers"')).toBe(true);
		expect(configSource.includes('id: "selected"')).toBe(true);
		expect(configSource.includes('id: "supplier"')).toBe(true);
		expect(configSource.includes("rowHeight: 48")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(50, 50, 50)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(92, 120, 104)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
