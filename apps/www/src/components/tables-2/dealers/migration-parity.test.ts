import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Dealers Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without manual query fetching", () => {
		const source = readSource(
			"app/(sidebar)/(sales)/sales-book/dealers/page.tsx",
		);

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("<PageTitle>Dealers</PageTitle>")).toBe(true);
		expect(source.includes("<DealersAdminPage")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("dealers")')).toBe(true);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/dealers")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("fetchQuery")).toBe(false);
	});

	it("keeps the admin page flat, saved-tab capable, and connected to the table-core dealer table", () => {
		const source = readSource("components/dealers/dealers-admin-page.tsx");

		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("PageTabs")).toBe(true);
		expect(source.includes("SavePageTabButton")).toBe(true);
		expect(source.includes("border-b border-border pb-3")).toBe(false);
		expect(source.includes("DealersColumnVisibility")).toBe(true);
		expect(source.includes("<DataTable")).toBe(true);
		expect(source.includes("@gnd/ui/table")).toBe(false);
		expect(source.includes("invalidatePageTabsForPathKeys")).toBe(true);
	});

	it("keeps the table-owned scroll, column-drag, and core row behavior from Sales Orders", () => {
		const source = readSource("components/tables-2/dealers/data-table.tsx");

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="dealers-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact header drag sorting hooks, action header, and resize behavior", () => {
		const source = readSource("components/tables-2/dealers/table-header.tsx");

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("useSortQuery")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Dealers registered for compact table settings and content-tailored widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource("components/tables-2/dealers/columns.tsx");

		expect(settingsSource.includes('| "dealers"')).toBe(true);
		expect(configSource.includes("dealers: {")).toBe(true);
		expect(configSource.includes('tableId: "dealers"')).toBe(true);
		expect(configSource.includes("rowHeight: 48")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(150, 280, 200)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 116)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 280, 210)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 170, 128)")).toBe(true);
		expect(columnsSource.includes("size-6")).toBe(true);
		expect(columnsSource.includes("h-8 min-w-0 flex-1")).toBe(true);
	});
});
