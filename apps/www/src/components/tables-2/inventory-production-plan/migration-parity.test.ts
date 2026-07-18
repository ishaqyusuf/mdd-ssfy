import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(join(ROOT, path), "utf8");
}

describe("inventory production plan tables-2 migration", () => {
	it("uses the restarted route shell and tables-2 module", () => {
		const routeSource = readSource(
			"app/(sidebar)/inventory/production-plan/page.tsx",
		);
		const compactRouteSource = routeSource.replace(/\s+/g, "");

		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(
			compactRouteSource.includes(
				'initialSettings=awaitgetInitialTableSettings("inventory-production-plan"',
			),
		).toBe(true);
		expect(
			routeSource.includes(
				"components/tables-2/inventory-production-plan/skeleton",
			),
		).toBe(true);
	});

	it("keeps production plan controls while replacing component cards", () => {
		const source = readSource(
			"components/inventory/inventory-production-plan-page.tsx",
		);

		expect(
			source.includes(
				"components/tables-2/inventory-production-plan/data-table",
			),
		).toBe(true);
		expect(source.includes("components.map((component)")).toBe(false);
		expect(source.includes("buildSalesInventoryPrintViewerUrl")).toBe(true);
		expect(source.includes("salesProductionPlan")).toBe(true);
	});

	it("uses core table behaviors with compact custom columns", () => {
		const tableSource = readSource(
			"components/tables-2/inventory-production-plan/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/inventory-production-plan/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-production-plan/table-header.tsx",
		);
		const configSource = readSource("utils/table-configs.ts");

		expect(
			tableSource.includes('const TABLE_ID = "inventory-production-plan"'),
		).toBe(true);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useTableSettings")).toBe(true);
		expect(tableSource.includes("useTableDnd")).toBe(true);
		expect(tableSource.includes("useStickyColumns")).toBe(true);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(columnsSource.includes("sizes.custom(200, 380, 250)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(160, 280, 190)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(124, 190, 140)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes('className="h-8 px-2 text-xs"')).toBe(true);
		expect(
			/"inventory-production-plan": \{[\s\S]*sizes\.custom\(200, 380, 250\)[\s\S]*rowHeight: 56/.test(
				configSource,
			),
		).toBe(true);
	});
});
