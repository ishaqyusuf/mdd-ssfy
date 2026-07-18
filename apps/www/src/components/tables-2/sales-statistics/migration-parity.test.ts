import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Statistics Product Report Sales Orders table migration parity", () => {
	it("keeps both product-report routes on the restarted Sales Orders shell", () => {
		const topSellingSource = readSource(
			"app/(sidebar)/(sales)/sales-book/top-selling-products/page.tsx",
		);
		const productReportSource = readSource(
			"app/(sidebar)/(sales)/product-report/page.tsx",
		);
		const source = `${topSellingSource}\n${productReportSource}`;

		expect(source.includes("PageShell")).toBe(true);
		expect(source.includes("HydrateClient")).toBe(true);
		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("sales-statistics")')).toBe(
			true,
		);
		expect(source.includes("<ProductReportHeader />")).toBe(true);
		expect(
			source.includes("components/tables-2/sales-statistics/data-table"),
		).toBe(true);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/sales-statistics")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, virtualization, and product row-open behavior", () => {
		const source = readSource(
			"components/tables-2/sales-statistics/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-statistics-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("useTableScroll")).toBe(true);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("useSuspenseInfiniteQuery")).toBe(true);
		expect(source.includes("trpc.sales.getProductReport")).toBe(true);
		expect(source.includes("useVirtualizer")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(
			source.includes(
				"openLink(`/sales-book/top-selling-products/${productId}`",
			),
		).toBe(true);
		expect(source.includes("<TableGrid")).toBe(true);
	});

	it("keeps compact draggable headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/sales-statistics/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("HorizontalPagination")).toBe(true);
		expect(source.includes("getTableCellPaddingClass(tableConfig.style)")).toBe(
			true,
		);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Sales Statistics registered for compact product-report widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/sales-statistics/columns.tsx",
		);

		expect(settingsSource.includes('| "sales-statistics"')).toBe(true);
		expect(configSource.includes('"sales-statistics": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-statistics"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(200, 380, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(116, 220, 140)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(88, 132, 100)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(92, 132, 104)")).toBe(true);
		expect(columnsSource.includes("size-8")).toBe(true);
	});
});
