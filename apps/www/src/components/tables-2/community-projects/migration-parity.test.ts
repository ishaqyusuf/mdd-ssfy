import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Community Projects Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without the shared sticky header abstraction", () => {
		const source = readSource("app/(sidebar)/community/(main)/projects/page.tsx");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("<PageTitle>Projects</PageTitle>")).toBe(true);
		expect(source.includes("<CommunityProjectHeader />")).toBe(true);
		expect(source.includes("<CommunityProjectsAnalyticsCards />")).toBe(true);
		expect(
			source.includes("<DataTable initialSettings={initialSettings} />"),
		).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(
			source.includes('getInitialTableSettings("community-projects")'),
		).toBe(true);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/community-project")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps the table-owned scroll, column-drag, selection, and bottom-bar behavior from Sales Orders", () => {
		const source = readSource(
			"components/tables-2/community-projects/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="community-projects-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(
			true,
		);
		expect(source.includes("<BottomBar data={tableData} />")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(
			true,
		);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps header drag sorting hooks, select-all, action header, and resize behavior", () => {
		const source = readSource(
			"components/tables-2/community-projects/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("useSortQuery")).toBe(true);
		expect(source.includes("table.toggleAllPageRowsSelected")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Community Projects registered for table settings and row height config", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(settingsSource.includes('| "community-projects"')).toBe(true);
		expect(configSource.includes('"community-projects": {')).toBe(true);
		expect(configSource.includes('tableId: "community-projects"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
	});
});
