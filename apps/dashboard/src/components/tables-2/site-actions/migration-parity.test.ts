import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Site Actions Sales Orders table migration parity", () => {
	it("keeps the site actions route on the restarted table shell", () => {
		const source = readSource("app/(sidebar)/site-actions/page.tsx");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("site-actions")')).toBe(
			true,
		);
		expect(source.includes("SiteActionsColumnVisibility")).toBe(true);
		expect(source.includes("SiteActionsSkeleton")).toBe(true);
		expect(source.includes("components/tables-2/site-actions/data-table")).toBe(
			true,
		);
		expect(source.includes("components/tables/site-actions")).toBe(false);
		expect(source.includes("components/tables/skeleton")).toBe(false);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, persisted settings, and selection", () => {
		const source = readSource("components/tables-2/site-actions/data-table.tsx");

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="site-actions-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar data={tableData} />")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact tailored columns, sorting, and table settings registration", () => {
		const columnsSource = readSource(
			"components/tables-2/site-actions/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/site-actions/table-header.tsx",
		);
		const schemaSource = readSource("../../api/src/schemas/site-actions.ts");
		const querySource = readSource("../../api/src/db/queries/site-action.ts");
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(150, 230, 170)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(280, 680, 420)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(90, 140, 100)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("tableConfig.nonReorderableColumns")).toBe(
			true,
		);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(schemaSource.includes("sort: z.array(z.string())")).toBe(true);
		expect(querySource.includes("sortSiteActions")).toBe(true);
		expect(settingsSource.includes('| "site-actions"')).toBe(true);
		expect(configSource.includes('"site-actions": {')).toBe(true);
		expect(configSource.includes('tableId: "site-actions"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
