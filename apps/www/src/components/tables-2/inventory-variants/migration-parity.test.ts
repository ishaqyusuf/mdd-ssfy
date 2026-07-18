import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(join(ROOT, path), "utf8");
}

describe("inventory variants tables-2 migration", () => {
	it("uses the restarted route shell and tables-2 module", () => {
		const routeSource = readSource("app/(sidebar)/inventory/variants/page.tsx");

		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(
			routeSource.includes('getInitialTableSettings("inventory-variants")'),
		).toBe(true);
		expect(
			routeSource.includes("components/tables-2/inventory-variants/skeleton"),
		).toBe(true);
	});

	it("keeps the workspace on the variants table instead of cards", () => {
		const source = readSource(
			"components/inventory/inventory-variants-workspace-page.tsx",
		);

		expect(
			source.includes("components/tables-2/inventory-variants/data-table"),
		).toBe(true);
		expect(source.includes("VariantCard")).toBe(false);
	});

	it("uses core table behaviors with compact custom columns", () => {
		const tableSource = readSource(
			"components/tables-2/inventory-variants/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/inventory-variants/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-variants/table-header.tsx",
		);

		expect(tableSource.includes('const TABLE_ID = "inventory-variants"')).toBe(
			true,
		);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useTableSettings")).toBe(true);
		expect(tableSource.includes("useTableDnd")).toBe(true);
		expect(tableSource.includes("useStickyColumns")).toBe(true);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(columnsSource.includes("sizes.custom(260, 500, 320)")).toBe(true);
	});
});
