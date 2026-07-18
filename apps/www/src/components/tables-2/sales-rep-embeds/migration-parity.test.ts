import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Rep dashboard table embed migration parity", () => {
	it("renders recent sales and recent quotes through tables-2 inside the Sales Orders-style shell", () => {
		const source = readSource("app/(sidebar)/(sales)/sales-rep/page.tsx");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("HydrateClient")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("sales-orders")')).toBe(
			true,
		);
		expect(source.includes('getInitialTableSettings("sales-quotes")')).toBe(
			true,
		);
		expect(
			source.includes("@/components/tables-2/sales-orders/data-table"),
		).toBe(true);
		expect(
			source.includes("@/components/tables-2/sales-quotes/data-table"),
		).toBe(true);
		expect(source.includes("components/tables/sales-orders/data-table")).toBe(
			false,
		);
		expect(source.includes("components/tables/sales-quotes/data-table")).toBe(
			false,
		);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("PageStickyHeader")).toBe(false);
	});

	it("keeps both dashboard embeds single-page, compact, and scoped through explicit default filters", () => {
		const source = readSource("app/(sidebar)/(sales)/sales-rep/page.tsx");

		expect(source.includes("showing: null")).toBe(true);
		expect(source.includes("size: 5")).toBe(true);
		expect(source.includes("defaultFilters={recentSalesFilters}")).toBe(true);
		expect(source.includes("defaultFilters={recentQuoteFilters}")).toBe(true);
		expect(source.includes("<RecentSalesDataTable")).toBe(true);
		expect(source.includes("<RecentQuoteDataTable")).toBe(true);
		expect(source.includes("embedded")).toBe(true);
		expect(source.includes("singlePage")).toBe(true);
	});

	it("keeps the shared order and quote tables on table-core scroll with embedded height support", () => {
		const ordersSource = readSource(
			"components/tables-2/sales-orders/data-table.tsx",
		);
		const quotesSource = readSource(
			"components/tables-2/sales-quotes/data-table.tsx",
		);

		for (const source of [ordersSource, quotesSource]) {
			expect(source.includes("VirtualRow")).toBe(true);
			expect(source.includes("useScrollHeader(parentRef")).toBe(true);
			expect(source.includes("useTableDnd(table)")).toBe(true);
			expect(source.includes("<DndContext")).toBe(true);
			expect(source.includes("defaultFilters?:")).toBe(true);
			expect(source.includes("singlePage?: boolean")).toBe(true);
			expect(source.includes("embedded?: boolean")).toBe(true);
			expect(
				source.includes("hasNextPage: singlePage ? false : hasNextPage"),
			).toBe(true);
			expect(source.includes("const tableHeight = embedded")).toBe(true);
			expect(source.includes("height: tableHeight")).toBe(true);
			expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
			expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		}
	});

	it("keeps compact table defaults and content-tailored sales embed column widths", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");
		const ordersColumns = readSource(
			"components/tables-2/sales-orders/columns.tsx",
		);
		const quotesColumns = readSource(
			"components/tables-2/sales-quotes/columns.tsx",
		);

		expect(configSource.includes('"sales-orders": {')).toBe(true);
		expect(configSource.includes('"sales-quotes": {')).toBe(true);
		expect(configSource.includes("rowHeight: 40")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(settingsSource.includes('"sales-orders": [')).toBe(true);
		expect(settingsSource.includes('"sales-quotes": ["salesRepInitial"]')).toBe(
			true,
		);
		expect(ordersColumns.includes("sizes.custom(110, 180, 130)")).toBe(true);
		expect(ordersColumns.includes("sizes.custom(120, 220, 140)")).toBe(true);
		expect(ordersColumns.includes("sizes.custom(180, 380, 240)")).toBe(true);
		expect(quotesColumns.includes("sizes.custom(150, 280, 180)")).toBe(true);
		expect(quotesColumns.includes("sizes.custom(180, 340, 220)")).toBe(true);
		expect(quotesColumns.includes("sizes.custom(104, 160, 118)")).toBe(true);
	});
});
