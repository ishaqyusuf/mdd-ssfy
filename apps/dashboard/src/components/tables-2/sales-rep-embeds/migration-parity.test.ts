import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Rep dashboard table embed migration parity", () => {
	it("renders recent sales as a bounded panel and keeps recent quotes on tables-2", () => {
		const source = readSource("app/(sidebar)/(sales)/sales-rep/page.tsx");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("HydrateClient")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("sales-orders")')).toBe(
			false,
		);
		expect(source.includes('getInitialTableSettings("sales-quotes")')).toBe(
			true,
		);
		expect(source.includes("@/components/sales-rep/recent-sales-panel")).toBe(
			true,
		);
		expect(source.includes("<RecentSalesPanel")).toBe(true);
		expect(source.includes("<RecentSalesListSkeleton")).toBe(true);
		expect(
			source.includes("@/components/tables-2/sales-orders/data-table"),
		).toBe(false);
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

	it("keeps recent sales explicitly bounded and sales-rep scoped", () => {
		const source = readSource("app/(sidebar)/(sales)/sales-rep/page.tsx");
		const querySource = readSource(
			"components/sales-rep/recent-sales-query.ts",
		);

		expect(source.includes("RECENT_SALES_QUERY_INPUT")).toBe(true);
		expect(querySource.includes("showing: null")).toBe(true);
		expect(querySource.includes("size: 5")).toBe(true);
		expect(querySource.includes('sort: ["createdAt.desc"]')).toBe(true);
		expect(source.includes("defaultFilters={recentQuoteFilters}")).toBe(true);
		expect(source.includes("<RecentQuoteDataTable")).toBe(true);
		expect(source.includes("<RecentSalesDataTable")).toBe(false);
	});

	it("keeps the canonical orders table workspace-only", () => {
		const ordersSource = readSource(
			"components/tables-2/sales-orders/data-table.tsx",
		);

		expect(ordersSource.includes("VirtualRow")).toBe(true);
		expect(ordersSource.includes("useScrollHeader(parentRef")).toBe(true);
		expect(ordersSource.includes("useTableDnd(table)")).toBe(true);
		expect(ordersSource.includes("<DndContext")).toBe(true);
		expect(ordersSource.includes("defaultFilters?:")).toBe(false);
		expect(ordersSource.includes("singlePage?: boolean")).toBe(false);
		expect(ordersSource.includes("embedded?: boolean")).toBe(false);
		expect(ordersSource.includes("hasNextPage,")).toBe(true);
		expect(ordersSource.includes("rowHeight={tableConfig.rowHeight}")).toBe(
			true,
		);
		expect(ordersSource.includes('height: "var(--header-offset, 0px)"')).toBe(
			true,
		);
	});

	it("keeps canonical order and embedded quote table density unchanged", () => {
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
