import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Quotes Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without the shared sticky header abstraction", () => {
		const source = readSource(
			"app/(sidebar)/(sales)/sales-book/quotes/page.tsx",
		);

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("<PageTitle>Quotes</PageTitle>")).toBe(true);
		expect(source.includes("<SalesQuoteHeader />")).toBe(true);
		expect(
			source.includes("<DataTable initialSettings={initialSettings} />"),
		).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("sales-quotes")')).toBe(
			true,
		);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/sales-quotes")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps the table-owned scroll, column-drag, selection, and bottom-bar behavior from Sales Orders", () => {
		const source = readSource(
			"components/tables-2/sales-quotes/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-quotes-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar data={tableData} />")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact header drag sorting hooks, select-all, action header, and resize behavior", () => {
		const source = readSource(
			"components/tables-2/sales-quotes/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("useSortQuery")).toBe(true);
		expect(source.includes("table.toggleAllPageRowsSelected")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Sales Quotes registered for compact table settings and content-tailored widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/sales-quotes/columns.tsx",
		);

		expect(settingsSource.includes('| "sales-quotes"')).toBe(true);
		expect(configSource.includes('"sales-quotes": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-quotes"')).toBe(true);
		expect(configSource.includes("rowHeight: 40")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(150, 280, 180)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 340, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 170, 128)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 360, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 160, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 116)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(86, 130, 96)")).toBe(true);
	});
});
