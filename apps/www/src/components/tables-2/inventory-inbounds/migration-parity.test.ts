import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(join(ROOT, path), "utf8");
}

describe("inventory inbounds tables-2 migration", () => {
	it("uses the restarted route shell and tables-2 module", () => {
		const routeSource = readSource("app/(sidebar)/inventory/inbounds/page.tsx");

		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(
			routeSource.includes('getInitialTableSettings("inventory-inbounds")'),
		).toBe(true);
		expect(
			routeSource.includes("components/tables-2/inventory-inbounds/skeleton"),
		).toBe(true);
	});

	it("keeps receiving controls while replacing the shipment card queue", () => {
		const source = readSource(
			"components/inventory/inbound-receiving-page.tsx",
		);

		expect(
			source.includes("components/tables-2/inventory-inbounds/data-table"),
		).toBe(true);
		expect(source.includes("shipments.map((shipment)")).toBe(false);
		expect(source.includes("DocumentUploader")).toBe(true);
		expect(source.includes("Assign Selected Orders")).toBe(true);
	});

	it("uses core table behaviors with compact custom columns", () => {
		const tableSource = readSource(
			"components/tables-2/inventory-inbounds/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/inventory-inbounds/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-inbounds/table-header.tsx",
		);

		expect(tableSource.includes('const TABLE_ID = "inventory-inbounds"')).toBe(
			true,
		);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useTableSettings")).toBe(true);
		expect(tableSource.includes("useTableDnd")).toBe(true);
		expect(tableSource.includes("useStickyColumns")).toBe(true);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(columnsSource.includes("sizes.custom(190, 340, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(120, 150, 130)")).toBe(true);
	});
});
