import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(join(ROOT, path), "utf8");
}

describe("inventory dispatch mode tables-2 migration", () => {
	it("uses the restarted route shell and tables-2 module", () => {
		const routeSource = readSource(
			"app/(sidebar)/inventory/dispatch-mode/page.tsx",
		);
		const compactRouteSource = routeSource.replace(/\s+/g, "");

		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(
			compactRouteSource.includes(
				'initialSettings=awaitgetInitialTableSettings("inventory-dispatch-mode"',
			),
		).toBe(true);
		expect(
			routeSource.includes(
				"components/tables-2/inventory-dispatch-mode/skeleton",
			),
		).toBe(true);
	});

	it("keeps dispatch filters and mutations while replacing dispatch cards", () => {
		const source = readSource(
			"components/inventory/inventory-dispatch-mode-page.tsx",
		);

		expect(
			source.includes("components/tables-2/inventory-dispatch-mode/data-table"),
		).toBe(true);
		expect(source.includes("items.map((item)")).toBe(false);
		expect(source.includes("assignInventoryDispatchAllocations")).toBe(true);
		expect(source.includes("packInventoryDispatchAllocations")).toBe(true);
		expect(source.includes("fulfillInventoryDispatch")).toBe(true);
		expect(source.includes("releaseInventoryDispatchAllocations")).toBe(true);
	});

	it("uses core table behaviors with compact custom columns", () => {
		const tableSource = readSource(
			"components/tables-2/inventory-dispatch-mode/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/inventory-dispatch-mode/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-dispatch-mode/table-header.tsx",
		);
		const configSource = readSource("utils/table-configs.ts");

		expect(
			tableSource.includes('const TABLE_ID = "inventory-dispatch-mode"'),
		).toBe(true);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useTableSettings")).toBe(true);
		expect(tableSource.includes("useTableDnd")).toBe(true);
		expect(tableSource.includes("useStickyColumns")).toBe(true);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(columnsSource.includes("sizes.custom(160, 280, 190)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(200, 360, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(124, 190, 140)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("blockers.slice(0, 1)")).toBe(true);
		expect(columnsSource.includes('className="h-8 px-2 text-xs"')).toBe(true);
		expect(
			/"inventory-dispatch-mode": \{[\s\S]*sizes\.custom\(160, 280, 190\)[\s\S]*rowHeight: 56/.test(
				configSource,
			),
		).toBe(true);
	});
});
