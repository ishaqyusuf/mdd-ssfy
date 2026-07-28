import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(join(ROOT, path), "utf8");
}

describe("inventory kind review tables-2 migration", () => {
	it("uses the restarted route shell and tables-2 module", () => {
		const routeSource = readSource("app/(sidebar)/inventory/review/page.tsx");
		const normalizedRouteSource = routeSource.replace(/\s+/g, "");

		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchInfiniteQuery")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(normalizedRouteSource.includes("getInitialTableSettings(")).toBe(
			true,
		);
		expect(routeSource.includes('"inventory-kind-review"')).toBe(true);
		expect(
			routeSource.includes(
				"components/tables-2/inventory-kind-review/skeleton",
			),
		).toBe(true);
	});

	it("keeps the review controls while replacing card rows", () => {
		const source = readSource(
			"components/inventory/inventory-kind-review-page.tsx",
		);

		expect(
			source.includes("components/tables-2/inventory-kind-review/data-table"),
		).toBe(true);
		expect(source.includes("IntersectionObserver")).toBe(false);
		expect(source.includes("rows.map((row)")).toBe(false);
		expect(source.includes("backfillInventoryProductKinds")).toBe(true);
	});

	it("uses core table behaviors with compact custom columns", () => {
		const tableSource = readSource(
			"components/tables-2/inventory-kind-review/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/inventory-kind-review/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-kind-review/table-header.tsx",
		);
		const configSource = readSource("utils/table-configs.ts");

		expect(
			tableSource.includes('const TABLE_ID = "inventory-kind-review"'),
		).toBe(true);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useTableSettings")).toBe(true);
		expect(tableSource.includes("useTableDnd")).toBe(true);
		expect(tableSource.includes("useStickyColumns")).toBe(true);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(tableSource.includes("useInfiniteScroll")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(columnsSource.includes("sizes.custom(200, 380, 250)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 170, 128)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(84, 112, 96)")).toBe(true);
		expect(columnsSource.includes('className="size-7"')).toBe(true);
		expect(
			/"inventory-kind-review": \{[\s\S]*sizes\.custom\(200, 380, 250\)[\s\S]*rowHeight: 56/.test(
				configSource,
			),
		).toBe(true);
	});
});
