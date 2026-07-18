import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Accounting Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without manual query fetching", () => {
		const pageSource = readSource("components/sales-book/accounting-page.tsx");
		const routeSource = readSource(
			"app/(sidebar)/(sales)/sales-book/accounting/page.tsx",
		);

		expect(routeSource.includes("SalesBookAccountingPage")).toBe(true);
		expect(pageSource.includes("PageShell")).toBe(true);
		expect(pageSource.includes("HydrateClient")).toBe(true);
		expect(pageSource.includes("batchPrefetch([")).toBe(true);
		expect(
			pageSource.includes('getInitialTableSettings("sales-accounting")'),
		).toBe(true);
		expect(pageSource.includes("<SalesAccountingHeader />")).toBe(true);
		expect(
			pageSource.includes("components/tables-2/sales-accounting/data-table"),
		).toBe(true);
		expect(pageSource.includes("getQueryClient")).toBe(false);
		expect(pageSource.includes("fetchQuery")).toBe(false);
		expect(
			pageSource.includes("components/tables/sales-accounting/data-table"),
		).toBe(false);
		expect(pageSource.includes("@gnd/ui/data-table")).toBe(false);
		expect(pageSource.includes("PageStickyHeader")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, virtualization, selection, and row-open behavior", () => {
		const source = readSource(
			"components/tables-2/sales-accounting/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-accounting-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("useTableScroll")).toBe(true);
		expect(source.includes("startFromColumn: 2")).toBe(true);
		expect(source.includes("useSuspenseInfiniteQuery")).toBe(true);
		expect(source.includes("trpc.sales.getSalesAccountings")).toBe(true);
		expect(source.includes("useVirtualizer")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("setRowSelection")).toBe(true);
		expect(source.includes("openSalesAccountingId: row.id")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
	});

	it("keeps compact draggable headers, select-all, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/sales-accounting/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("HorizontalPagination")).toBe(true);
		expect(source.includes("table.toggleAllPageRowsSelected")).toBe(true);
		expect(source.includes("getTableCellPaddingClass(tableConfig.style)")).toBe(
			true,
		);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Sales Accounting registered for compact tailored column widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/sales-accounting/columns.tsx",
		);

		expect(settingsSource.includes('| "sales-accounting"')).toBe(true);
		expect(configSource.includes('"sales-accounting": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-accounting"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(118, 180, 136)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 360, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(140, 260, 170)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 190, 136)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 180, 130)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(130, 220, 150)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(92, 132, 104)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(64, 64)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
