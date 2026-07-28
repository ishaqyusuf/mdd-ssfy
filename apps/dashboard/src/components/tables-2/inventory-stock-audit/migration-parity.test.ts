import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(join(ROOT, path), "utf8");
}

describe("inventory stock audit tables-2 migration", () => {
	it("uses the restarted route shell and prefetches the existing audit report", () => {
		const routeSource = readSource("app/(sidebar)/inventory/stocks/page.tsx");
		const normalizedRouteSource = routeSource.replace(/\s+/g, "");

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("HydrateClient")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			routeSource.includes(
				"trpc.inventories.stockAuditVerificationReport.queryOptions",
			),
		).toBe(true);
		expect(
			normalizedRouteSource.includes(
				'getInitialTableSettings("inventory-stock-audit"',
			),
		).toBe(true);
		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("fetchInfiniteQuery")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
	});

	it("keeps the stock adjustment form while replacing mapped audit cards", () => {
		const source = readSource(
			"components/inventory/inventory-stock-operations-page.tsx",
		);

		expect(
			source.includes("components/tables-2/inventory-stock-audit/data-table"),
		).toBe(true);
		expect(source.includes("adjustInventoryStock")).toBe(true);
		expect(source.includes("stockAuditVerificationReport")).toBe(true);
		expect(source.includes("queryClient.invalidateQueries")).toBe(true);
		expect(source.includes("rows.map((row)")).toBe(false);
		expect(source.includes("Audit Verification")).toBe(true);
	});

	it("uses core table behaviors with compact stock-audit columns", () => {
		const tableSource = readSource(
			"components/tables-2/inventory-stock-audit/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/inventory-stock-audit/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-stock-audit/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configsSource = readSource("utils/table-configs.ts");

		expect(
			tableSource.includes('const TABLE_ID = "inventory-stock-audit"'),
		).toBe(true);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useScrollHeader(parentRef")).toBe(true);
		expect(tableSource.includes("useTableSettings")).toBe(true);
		expect(tableSource.includes("useTableDnd")).toBe(true);
		expect(tableSource.includes("useStickyColumns")).toBe(true);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(columnsSource.includes("sizes.custom(160, 260, 190)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(190, 300, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(92, 132, 104)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(
			columnsSource.includes('className="h-6 max-w-full px-2 text-[11px]"'),
		).toBe(true);
		expect(settingsSource.includes('"inventory-stock-audit"')).toBe(true);
		expect(configsSource.includes('tableId: "inventory-stock-audit"')).toBe(
			true,
		);
		expect(
			/"inventory-stock-audit": \{[\s\S]*sizes\.custom\(160, 260, 190\)[\s\S]*rowHeight: 56/.test(
				configsSource,
			),
		).toBe(true);
		expect(configsSource.includes("rowHeight: 56")).toBe(true);
		expect(configsSource.includes('style: "compact"')).toBe(true);
	});
});
