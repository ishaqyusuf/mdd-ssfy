import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Customer overview inline table migration parity", () => {
	it("moves Pay Portal off the legacy sheet table", () => {
		const source = readSource(
			"components/sheets/customer-overview-sheet/pay-portal-tab.tsx",
		);

		expect(source.includes("CustomerPayPortalDataTable")).toBe(true);
		expect(source.includes("CustomerPayPortalColumnVisibility")).toBe(true);
		expect(source.includes('@gnd/ui/table"')).toBe(false);
		expect(source.includes('<Table className="table-sm"')).toBe(false);
		expect(source.includes("TCell")).toBe(false);
		expect(source.includes("table-cells")).toBe(false);
		expect(source.includes("onToggleSelection")).toBe(true);
	});

	it("moves Sales List off the legacy sheet table", () => {
		const source = readSource(
			"components/sheets/customer-overview-sheet/sales-list.tsx",
		);

		expect(source.includes("CustomerSalesListDataTable")).toBe(true);
		expect(source.includes("CustomerSalesListColumnVisibility")).toBe(true);
		expect(source.includes('@gnd/ui/table"')).toBe(false);
		expect(source.includes('<Table className="table-sm"')).toBe(false);
		expect(source.includes("ProgressStatus")).toBe(false);
		expect(source.includes("Skeleton")).toBe(false);
	});

	it("keeps Pay Portal table-core scrolling, DnD, resize, and selection behavior", () => {
		const source = readSource(
			"components/tables-2/customer-pay-portal/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="customer-pay-portal-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("startFromColumn: 2")).toBe(true);
		expect(source.includes("onToggleSelection(sale)")).toBe(true);
		expect(source.includes("clamp(220px")).toBe(true);
	});

	it("keeps Sales List table-core scrolling, DnD, and resize behavior", () => {
		const source = readSource(
			"components/tables-2/customer-sales-list/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="customer-sales-list-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("clamp(220px")).toBe(true);
	});

	it("keeps compact headers, horizontal pagination, and resize handles", () => {
		const payPortalHeader = readSource(
			"components/tables-2/customer-pay-portal/table-header.tsx",
		);
		const salesListHeader = readSource(
			"components/tables-2/customer-sales-list/table-header.tsx",
		);
		const source = `${payPortalHeader}\n${salesListHeader}`;

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("HorizontalPagination")).toBe(true);
		expect(source.includes("getTableCellPaddingClass(tableConfig.style)")).toBe(
			true,
		);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("registers both tables with compact tailored widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const payPortalColumns = readSource(
			"components/tables-2/customer-pay-portal/columns.tsx",
		);
		const salesListColumns = readSource(
			"components/tables-2/customer-sales-list/columns.tsx",
		);

		expect(settingsSource.includes('| "customer-pay-portal"')).toBe(true);
		expect(settingsSource.includes('| "customer-sales-list"')).toBe(true);
		expect(configSource.includes('"customer-pay-portal": {')).toBe(true);
		expect(configSource.includes('"customer-sales-list": {')).toBe(true);
		expect(configSource.includes('tableId: "customer-pay-portal"')).toBe(true);
		expect(configSource.includes('tableId: "customer-sales-list"')).toBe(true);
		expect(configSource.includes("rowHeight: 48")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(payPortalColumns.includes("sizes.custom(50, 50, 50)")).toBe(true);
		expect(payPortalColumns.includes("sizes.custom(132, 220, 154)")).toBe(true);
		expect(payPortalColumns.includes("sizes.custom(116, 180, 132)")).toBe(true);
		expect(payPortalColumns.includes("sizes.custom(112, 170, 128)")).toBe(true);
		expect(payPortalColumns.includes("md:sticky md:left-[50px]")).toBe(true);
		expect(salesListColumns.includes("sizes.custom(112, 170, 128)")).toBe(true);
		expect(salesListColumns.includes("sizes.custom(110, 180, 128)")).toBe(true);
		expect(salesListColumns.includes("sizes.custom(132, 220, 154)")).toBe(true);
		expect(salesListColumns.includes("sizes.custom(120, 190, 140)")).toBe(true);
	});
});
