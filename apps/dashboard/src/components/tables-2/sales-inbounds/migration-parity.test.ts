import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Book Inbounds table migration parity", () => {
	it("keeps the route on the restarted table shell", () => {
		const source = readSource(
			"app/(sidebar)/(sales)/sales-book/inbounds/page.tsx",
		);

		expect(source.includes("PageShell")).toBe(true);
		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("HydrateClient")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("sales-inbounds")')).toBe(
			true,
		);
		expect(source.includes("SalesInboundsSkeleton")).toBe(true);
		expect(source.includes("initialSettings={initialSettings}")).toBe(true);
		expect(source.includes("components/tables/skeleton")).toBe(false);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchQuery")).toBe(false);
	});

	it("replaces the primary collapsible shipment cards with the tables-2 module", () => {
		const source = readSource("components/sales-inbounds-workspace.tsx");

		expect(
			source.includes("components/tables-2/sales-inbounds/data-table"),
		).toBe(true);
		expect(
			source.includes("components/tables-2/sales-inbounds/column-visibility"),
		).toBe(true);
		expect(source.includes("<SalesInboundsTable")).toBe(true);
		expect(source.includes("filteredShipments.map((shipment)")).toBe(false);
		expect(source.includes("<Collapsible")).toBe(false);
		expect(source.includes("updateInboundShipmentStatus")).toBe(true);
		expect(source.includes("receiveInboundShipment")).toBe(true);
		expect(source.includes("Activity History")).toBe(true);
	});

	it("keeps search, status, and selected inbound state in the URL", () => {
		const source = readSource("components/sales-inbounds-workspace.tsx");
		const sidebarSource = readSource("components/sidebar-links.ts");
		const actionsSource = readSource(
			"components/tables-2/inbound-management/columns.tsx",
		);

		expect(source.includes("parseAsStringLiteral(inboundStatuses)")).toBe(true);
		expect(source.includes("inboundId: parseAsInteger")).toBe(true);
		expect(source.includes("<SearchFilterTRPC")).toBe(true);
		expect(source.includes("void setParams({ inboundId })")).toBe(true);
		expect(sidebarSource.includes('"/sales-book/inbounds"')).toBe(true);
		expect(
			actionsSource.includes("router.push(`/sales-book/inbounds${query}`)"),
		).toBe(true);
	});

	it("uses core table behavior with compact tailored columns", () => {
		const tableSource = readSource(
			"components/tables-2/sales-inbounds/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/sales-inbounds/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/sales-inbounds/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(tableSource.includes('const TABLE_ID = "sales-inbounds"')).toBe(
			true,
		);
		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(tableSource.includes("useTableDnd(table)")).toBe(true);
		expect(tableSource.includes("<DndContext")).toBe(true);
		expect(tableSource.includes('id="sales-inbounds-table-dnd"')).toBe(true);
		expect(tableSource.includes("useTableScroll")).toBe(true);
		expect(tableSource.includes("startFromColumn: 1")).toBe(true);
		expect(tableSource.includes("rowHeight={tableConfig.rowHeight}")).toBe(
			true,
		);
		expect(
			tableSource.includes("estimateSize: () => tableConfig.rowHeight"),
		).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(columnsSource.includes("sizes.custom(190, 340, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 140, 116)")).toBe(true);
		expect(settingsSource.includes('| "sales-inbounds"')).toBe(true);
		expect(configSource.includes('"sales-inbounds": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-inbounds"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
