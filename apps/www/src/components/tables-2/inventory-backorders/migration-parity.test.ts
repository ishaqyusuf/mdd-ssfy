import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(join(ROOT, path), "utf8");
}

describe("inventory backorders tables-2 migration", () => {
	it("uses the restarted route shell and tables-2 module", () => {
		const routeSource = readSource(
			"app/(sidebar)/inventory/backorders/page.tsx",
		);

		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(
			routeSource.includes('getInitialTableSettings("inventory-backorders")'),
		).toBe(true);
		expect(
			routeSource.includes("components/tables-2/inventory-backorders/skeleton"),
		).toBe(true);
	});

	it("keeps the workspace controls while replacing the card queue with a table", () => {
		const source = readSource(
			"components/inventory/inventory-backorder-queue-page.tsx",
		);

		expect(
			source.includes("components/tables-2/inventory-backorders/data-table"),
		).toBe(true);
		expect(source.includes("blockerComponents.map")).toBe(false);
	});

	it("uses core table behaviors with compact custom columns", () => {
		const tableSource = readSource(
			"components/tables-2/inventory-backorders/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/inventory-backorders/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-backorders/table-header.tsx",
		);
		const configSource = readSource("utils/table-configs.ts");

		expect(
			tableSource.includes('const TABLE_ID = "inventory-backorders"'),
		).toBe(true);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useTableSettings")).toBe(true);
		expect(tableSource.includes("useTableDnd")).toBe(true);
		expect(tableSource.includes("useStickyColumns")).toBe(true);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(columnsSource.includes("sizes.custom(160, 280, 190)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("blockers.slice(0, 1)")).toBe(true);
		expect(columnsSource.includes('className="h-8 px-2 text-xs"')).toBe(
			true,
		);
		expect(
			/"inventory-backorders": \{[\s\S]*sizes\.custom\(160, 280, 190\)[\s\S]*rowHeight: 56/.test(
				configSource,
			),
		).toBe(true);
	});
});
