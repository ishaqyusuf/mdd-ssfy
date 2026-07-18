import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Community Builders Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without manual query fetching", () => {
		const source = readSource(
			"app/(sidebar)/community/(main)/builders/page.tsx",
		);

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("<PageTitle>Builder</PageTitle>")).toBe(true);
		expect(source.includes("<BuilderHeader />")).toBe(true);
		expect(
			source.includes("<DataTable initialSettings={initialSettings} />"),
		).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(
			source.includes('getInitialTableSettings("community-builders")'),
		).toBe(true);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/builder")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
	});

	it("keeps the builder header on the restarted search and column controls", () => {
		const source = readSource("components/builder-header.tsx");

		expect(source.includes("SearchFilterAdapter")).toBe(true);
		expect(source.includes("CommunityBuildersColumnVisibility")).toBe(true);
		expect(source.includes("OpenBuilderModal")).toBe(true);
	});

	it("keeps table-owned scroll, DnD, infinite loading, and row-open behavior", () => {
		const source = readSource(
			"components/tables-2/community-builders/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="community-builders-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("useInfiniteScroll")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("openBuilderId: builderId")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
	});

	it("keeps draggable sortable headers and compact tailored widths", () => {
		const headerSource = readSource(
			"components/tables-2/community-builders/table-header.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/community-builders/columns.tsx",
		);
		const configSource = readSource("utils/table-configs.ts");

		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("useSortQuery")).toBe(true);
		expect(headerSource.includes("tableConfig.nonReorderableColumns")).toBe(
			true,
		);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(84, 130, 100)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(72, 96, 80)")).toBe(true);
		expect(configSource.includes('tableId: "community-builders"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
