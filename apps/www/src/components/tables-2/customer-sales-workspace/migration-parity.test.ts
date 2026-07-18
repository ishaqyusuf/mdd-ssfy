import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Customer Sales Workspace table migration parity", () => {
	it("moves the workspace off the inline sheet table", () => {
		const source = readSource(
			"components/sheets/customer-overview-sheet/customer-sales-workspace.tsx",
		);

		expect(source.includes("CustomerSalesWorkspaceDataTable")).toBe(true);
		expect(source.includes("CustomerSalesWorkspaceColumnVisibility")).toBe(
			true,
		);
		expect(source.includes('@gnd/ui/table"')).toBe(false);
		expect(source.includes("<Table")).toBe(false);
		expect(source.includes("<TableHeader")).toBe(false);
		expect(source.includes("<TableBody")).toBe(false);
		expect(source.includes("StatusBadge")).toBe(false);
		expect(source.includes("onToggleAll={toggleAll}")).toBe(true);
		expect(source.includes("overviewOpen.openQuoteSheet(item.uuid)")).toBe(
			true,
		);
		expect(source.includes("overviewOpen.openSalesAdminSheet(item.uuid)")).toBe(
			true,
		);
	});

	it("keeps table-owned scroll, DnD, resize, selection, and row-open behavior", () => {
		const source = readSource(
			"components/tables-2/customer-sales-workspace/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="customer-sales-workspace-table-dnd"')).toBe(
			true,
		);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("startFromColumn: 2")).toBe(true);
		expect(source.includes("onOpenRow(item)")).toBe(true);
		expect(source.includes("onToggleAll")).toBe(true);
		expect(source.includes("onToggleRow")).toBe(true);
		expect(source.includes("clamp(260px")).toBe(true);
	});

	it("keeps select-all, compact headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/customer-sales-workspace/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("HorizontalPagination")).toBe(true);
		expect(source.includes("getTableCellPaddingClass(tableConfig.style)")).toBe(
			true,
		);
		expect(source.includes("ResizeHandle")).toBe(true);
		expect(source.includes("workspaceMeta?.onToggleAll")).toBe(true);
		expect(source.includes('"indeterminate"')).toBe(true);
	});

	it("keeps row actions and status rendering inside typed columns", () => {
		const source = readSource(
			"components/tables-2/customer-sales-workspace/columns.tsx",
		);

		expect(source.includes("SalesMenu")).toBe(true);
		expect(source.includes("SalesMenu.Delete")).toBe(true);
		expect(source.includes("SalesMenu.QuoteEmailMenuItems")).toBe(true);
		expect(source.includes("SalesMenu.SalesEmailMenuItems")).toBe(true);
		expect(source.includes("Icons.MoreHoriz")).toBe(true);
		expect(source.includes("paymentLabel")).toBe(true);
		expect(source.includes("deliveryLabel")).toBe(true);
		expect(source.includes("getCustomerSalesWorkspaceRowId")).toBe(true);
		expect(source.includes("`${row.type}-${row.id}`")).toBe(true);
	});

	it("registers compact tailored workspace widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/customer-sales-workspace/columns.tsx",
		);

		expect(settingsSource.includes('| "customer-sales-workspace"')).toBe(true);
		expect(configSource.includes('"customer-sales-workspace": {')).toBe(true);
		expect(configSource.includes('tableId: "customer-sales-workspace"')).toBe(
			true,
		);
		expect(configSource.includes("rowHeight: 40")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(
			configSource.includes('new Set(["select", "order", "actions"])'),
		).toBe(true);
		expect(columnsSource.includes("sizes.custom(50, 50, 50)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(132, 220, 154)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(170, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(78, 108, 86)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(128, 190, 148)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(118, 180, 136)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(56, 80, 64)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:left-[50px]")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
