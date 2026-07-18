import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Customers Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without the shared sticky header abstraction", () => {
		const source = readSource(
			"app/(sidebar)/(sales)/sales-book/customers/page.tsx",
		);

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("<PageTitle>Sales Customers</PageTitle>")).toBe(
			true,
		);
		expect(source.includes("<CustomerHeader />")).toBe(true);
		expect(
			source.includes("<DataTable initialSettings={initialSettings} />"),
		).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("customers")')).toBe(true);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/customers")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps the table-owned scroll, column-drag, and core row behavior from Sales Orders", () => {
		const source = readSource("components/tables-2/customers/data-table.tsx");

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="customers-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact header drag sorting hooks, action header, and resize behavior", () => {
		const source = readSource("components/tables-2/customers/table-header.tsx");

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("useSortQuery")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Sales Customers registered for compact table settings and content-tailored widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/customers/columns.tsx",
		);

		expect(settingsSource.includes('| "customers"')).toBe(true);
		expect(configSource.includes("customers: {")).toBe(true);
		expect(configSource.includes('tableId: "customers"')).toBe(true);
		expect(configSource.includes("rowHeight: 48")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 170, 128)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(130, 220, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(150, 280, 200)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 360, 240)")).toBe(true);
		expect(columnsSource.includes("size-6")).toBe(true);
	});
});
