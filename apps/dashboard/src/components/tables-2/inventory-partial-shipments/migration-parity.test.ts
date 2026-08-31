import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(join(ROOT, path), "utf8");
}

describe("inventory partial shipments tables-2 migration", () => {
	it("uses the restarted route shell and tables-2 module", () => {
		const routeSource = readSource(
			"app/(sidebar)/inventory/partial-shipments/page.tsx",
		);
		const compactRouteSource = routeSource.replace(/\s+/g, "");

		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(
			compactRouteSource.includes(
				'initialSettings=awaitgetInitialTableSettings("inventory-partial-shipments"',
			),
		).toBe(true);
		expect(
			routeSource.includes(
				"components/tables-2/inventory-partial-shipments/skeleton",
			),
		).toBe(true);
	});

	it("keeps filters and actions while replacing partial-shipment cards", () => {
		const routeSource = readSource(
			"app/(sidebar)/inventory/partial-shipments/page.tsx",
		);
		const tableSource = readSource(
			"components/tables-2/inventory-partial-shipments/data-table.tsx",
		);

		expect(
			routeSource.includes(
				"components/tables-2/inventory-partial-shipments/data-table",
			),
		).toBe(true);
		expect(routeSource.includes("salesPartialShipmentQueueSummary")).toBe(true);
		expect(tableSource.includes("setSalesInventoryLineFulfillmentHold")).toBe(
			true,
		);
		expect(tableSource.includes("InventoryShipAvailableDialog")).toBe(true);
	});

	it("uses core table behaviors with compact custom columns", () => {
		const tableSource = readSource(
			"components/tables-2/inventory-partial-shipments/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/inventory-partial-shipments/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/inventory-partial-shipments/table-header.tsx",
		);

		expect(
			tableSource.includes('const TABLE_ID = "inventory-partial-shipments"'),
		).toBe(true);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useTableSettings")).toBe(true);
		expect(tableSource.includes("useTableDnd")).toBe(true);
		expect(tableSource.includes("useStickyColumns")).toBe(true);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(tableSource.includes("useSuspenseInfiniteQuery")).toBe(true);
		expect(tableSource.includes("useInfiniteScroll")).toBe(true);
		expect(tableSource.includes("<BottomBar")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("flexRender")).toBe(true);
		expect(headerSource.includes('columnId === "select"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(160, 280, 190)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(200, 360, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(124, 190, 140)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(82, 120, 94)")).toBe(true);
		expect(columnsSource.includes("blockers.slice(0, 1)")).toBe(true);
		expect(columnsSource.includes('id: "delivery"')).toBe(true);
		expect(columnsSource.includes('id: "select"')).toBe(true);
		expect(columnsSource.includes("sticky: true")).toBe(true);
		expect(columnsSource.includes('className="h-8 px-2 text-xs"')).toBe(true);
	});

	it("keeps partial shipments on compact Sales Orders-style row height", () => {
		const configSource = readSource("utils/table-configs.ts");

		expect(
			configSource.includes(
				'"inventory-partial-shipments": {\n\t\ttableId: "inventory-partial-shipments"',
			),
		).toBe(true);
		expect(
			/"inventory-partial-shipments": \{[\s\S]*?id: "select"[\s\S]*?nonReorderableColumns: new Set\(\[\s*"select",\s*"order",\s*"hold",\s*"actions",?\s*\]\)[\s\S]*?rowHeight: 56/.test(
				configSource,
			),
		).toBe(true);
	});
});
