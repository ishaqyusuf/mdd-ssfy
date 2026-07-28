import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Community Templates Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without the shared sticky header abstraction", () => {
		const source = readSource(
			"app/(sidebar)/community/(main)/templates/page.tsx",
		);

		expect(source).toContain("ScrollableContent");
		expect(source).toContain("<PageTitle>Community Template</PageTitle>");
		expect(source).toContain("<CommunityTemplateHeader />");
		expect(source).toContain("<DataTable initialSettings={initialSettings} />");
		expect(source).toContain("batchPrefetch([");
		expect(source).toContain("loadSortParams");
		expect(source).not.toContain("PageStickyHeader");
		expect(source).not.toContain("fetchInfiniteQuery");
	});

	it("keeps the table-owned scroll and column-drag behavior from Sales Orders", () => {
		const source = readSource(
			"components/tables-2/community-templates/data-table.tsx",
		);

		expect(source).toContain("useScrollHeader(parentRef)");
		expect(source).toContain("useTableDnd(table)");
		expect(source).toContain("<DndContext");
		expect(source).toContain('id="community-templates-table-dnd"');
		expect(source).toContain("collisionDetection={closestCenter}");
		expect(source).toContain('height: "var(--header-offset, 0px)"');
		expect(source).toContain("rowHeight={tableConfig.rowHeight}");
		expect(source).toContain("estimateSize: () => tableConfig.rowHeight");
	});

	it("keeps header drag sorting, sort buttons, and resize behavior on the table header", () => {
		const source = readSource(
			"components/tables-2/community-templates/table-header.tsx",
		);

		expect(source).toContain("SortableContext");
		expect(source).toContain("horizontalListSortingStrategy");
		expect(source).toContain("DraggableHeader");
		expect(source).toContain("useSortQuery");
		expect(source).toContain("SortButton");
		expect(source).toContain("tableConfig.nonReorderableColumns");
		expect(source).toContain("ResizeHandle");
	});

	it("keeps Community Templates row height configured through TABLE_CONFIGS", () => {
		const source = readSource("utils/table-configs.ts");

		expect(source).toContain('"community-templates": {');
		expect(source).toContain('tableId: "community-templates"');
		expect(source).toContain("rowHeight: 64");
	});
});
