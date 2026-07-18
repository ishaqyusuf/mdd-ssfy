import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Customer Transactions table migration parity", () => {
	it("keeps customer transaction tabs off the legacy accounting table", () => {
		const tabSource = readSource(
			"components/sheets/customer-overview-sheet/transactions-tab.tsx",
		);
		const customerV2Source = readSource(
			"components/customer-v2/customer-overview-v2-content.tsx",
		);
		const source = `${tabSource}\n${customerV2Source}`;

		expect(
			tabSource.includes(
				"components/tables-2/customer-transactions/data-table",
			),
		).toBe(true);
		expect(tabSource.includes("CustomerTransactionsColumnVisibility")).toBe(
			true,
		);
		expect(
			source.includes(
				"components/tables/sales-accounting/table.customer-transaction",
			),
		).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and transaction row-open behavior", () => {
		const source = readSource(
			"components/tables-2/customer-transactions/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="customer-transactions-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("modal.viewTx(transaction.id)")).toBe(true);
		expect(source.includes("clamp(260px")).toBe(true);
	});

	it("keeps compact headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/customer-transactions/table-header.tsx",
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

	it("keeps customer transactions registered with compact tailored widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/customer-transactions/columns.tsx",
		);

		expect(settingsSource.includes('| "customer-transactions"')).toBe(true);
		expect(configSource.includes('"customer-transactions": {')).toBe(true);
		expect(configSource.includes('tableId: "customer-transactions"')).toBe(
			true,
		);
		expect(configSource.includes('id: "date"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(150, 230, 170)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(150, 300, 190)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(140, 220, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(82, 110, 90)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
