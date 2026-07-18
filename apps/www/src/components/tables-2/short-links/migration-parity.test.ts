import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Short Links Sales Orders table migration parity", () => {
	it("keeps the short links route on the restarted table shell", () => {
		const routeSource = readSource(
			"app/(sidebar)/settings/short-links/page.tsx",
		);
		const pageSource = readSource(
			"components/settings/short-links-settings-page.tsx",
		);
		const source = `${routeSource}\n${pageSource}`;

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(routeSource.includes('getInitialTableSettings("short-links")')).toBe(
			true,
		);
		expect(source.includes("ShortLinksColumnVisibility")).toBe(true);
		expect(source.includes("ShortLinksSkeleton")).toBe(true);
		expect(source.includes("components/tables-2/short-links/data-table")).toBe(
			true,
		);
		expect(source.includes("@gnd/ui/table")).toBe(false);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, persisted settings, and selection", () => {
		const source = readSource("components/tables-2/short-links/data-table.tsx");

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="short-links-table-dnd"')).toBe(true);
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
			"components/tables-2/short-links/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/short-links/table-header.tsx",
		);
		const schemaSource = readSource("../../api/src/schemas/short-links.ts");
		const querySource = readSource(
			"../../../packages/db/src/queries/short-links.ts",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(240, 560, 360)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(154, 190, 170)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("tableConfig.nonReorderableColumns")).toBe(
			true,
		);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(schemaSource.includes("sort: z.array(z.string())")).toBe(true);
		expect(querySource.includes("getShortLinkOrderBy")).toBe(true);
		expect(settingsSource.includes('| "short-links"')).toBe(true);
		expect(configSource.includes('"short-links": {')).toBe(true);
		expect(configSource.includes('tableId: "short-links"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
