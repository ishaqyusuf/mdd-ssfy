import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Unit Invoices Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without the shared sticky header abstraction", () => {
		const source = readSource(
			"app/(sidebar)/community/(main)/unit-invoices/page.tsx",
		);

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("<PageTitle>Unit Invoices</PageTitle>")).toBe(true);
		expect(source.includes("<UnitInvoicesHeader />")).toBe(true);
		expect(
			source.includes("<DataTable initialSettings={initialSettings} />"),
		).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps the route loading state on the Unit Invoices table skeleton", () => {
		const source = readSource(
			"app/(sidebar)/community/(main)/unit-invoices/loading.tsx",
		);

		expect(source.includes("UnitInvoicesSkeleton")).toBe(true);
		expect(source.includes("DataTableLoading")).toBe(false);
		expect(source.includes("_v1/data-table")).toBe(false);
		expect(source.includes("components/tables/skeleton")).toBe(false);
	});

	it("keeps the table-owned scroll and column-drag behavior from Sales Orders", () => {
		const source = readSource(
			"components/tables-2/unit-invoices/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="unit-invoices-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps header drag sorting and resize behavior on the table header", () => {
		const source = readSource(
			"components/tables-2/unit-invoices/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Unit Invoices row height configured through TABLE_CONFIGS", () => {
		const source = readSource("utils/table-configs.ts");

		expect(source.includes('"unit-invoices": {')).toBe(true);
		expect(source.includes('tableId: "unit-invoices"')).toBe(true);
		expect(source.includes("rowHeight: 64")).toBe(true);
	});

	it("keeps the Unit Invoice edit task grid on a domain-local table-core module", () => {
		const formSource = readSource("components/forms/unit-invoice-form.tsx");
		const tableSource = readSource(
			"components/tables-2/unit-invoice-form-tasks/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/unit-invoice-form-tasks/columns.tsx",
		);
		const configSource = readSource("utils/table-configs.ts");

		expect(
			formSource.includes(
				"../tables-2/unit-invoice-form-tasks/data-table",
			),
		).toBe(true);
		expect(formSource.includes("@gnd/ui/table")).toBe(false);
		expect(formSource.includes("table-sm")).toBe(false);
		expect(tableSource.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(tableSource.includes("useTableDnd(table)")).toBe(true);
		expect(tableSource.includes("<DndContext")).toBe(true);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("rowHeight={tableConfig.rowHeight}")).toBe(
			true,
		);
		expect(columnsSource.includes("onApplyFirstCheckNoToAll")).toBe(true);
		expect(columnsSource.includes("onApplyFirstCheckDateToAll")).toBe(true);
		expect(configSource.includes('"unit-invoice-form-tasks": {')).toBe(true);
		expect(configSource.includes("rowHeight: 52")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
