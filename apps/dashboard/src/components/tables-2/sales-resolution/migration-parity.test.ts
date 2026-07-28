import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Resolution Center Sales Orders table migration parity", () => {
	it("keeps the resolution center route on the restarted table shell", () => {
		const routeSource = readSource(
			"app/(sidebar)/(sales)/sales-book/accounting/resolution-center/page.tsx",
		);
		const pageSource = readSource(
			"components/sales-book/resolution-center-page.tsx",
		);
		const headerSource = readSource("components/sales-resolution-header.tsx");
		const wrapperSource = readSource("components/resolution-center/index.tsx");
		const source = `${routeSource}\n${pageSource}\n${headerSource}\n${wrapperSource}`;

		expect(pageSource.includes("ScrollableContent")).toBe(true);
		expect(pageSource.includes("batchPrefetch([")).toBe(true);
		expect(
			pageSource.includes('getInitialTableSettings("sales-resolution")'),
		).toBe(true);
		expect(source.includes("SalesResolutionColumnVisibility")).toBe(true);
		expect(source.includes("SalesResolutionSkeleton")).toBe(true);
		expect(
			source.includes("components/tables-2/sales-resolution/data-table"),
		).toBe(true);
		expect(source.includes("components/tables/skeleton")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, persisted settings, and details outside rows", () => {
		const source = readSource(
			"components/tables-2/sales-resolution/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-resolution-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar data={tableData} />")).toBe(true);
		expect(source.includes("<ResolutionDetails rows={selectedRows}")).toBe(
			true,
		);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact tailored columns, safe sorting, and table settings registration", () => {
		const columnsSource = readSource(
			"components/tables-2/sales-resolution/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/sales-resolution/table-header.tsx",
		);
		const querySource = readSource(
			"../../api/src/db/queries/sales-resolution.ts",
		);
		const filterSource = readSource(
			"hooks/use-resolution-center-filter-params.ts",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(132, 220, 154)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 340, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(140, 240, 170)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(124, 180, 144)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(96, 150, 112)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(124, 170, 136)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("tableConfig.nonReorderableColumns")).toBe(
			true,
		);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(querySource.includes("getSalesResolutionOrderBy")).toBe(true);
		expect(
			querySource.includes("orderBy: getSalesResolutionOrderBy(query.sort)"),
		).toBe(true);
		expect(filterSource.includes('"customer.name": parseAsString')).toBe(true);
		expect(filterSource.includes("status: parseAsString")).toBe(true);
		expect(settingsSource.includes('| "sales-resolution"')).toBe(true);
		expect(configSource.includes('"sales-resolution": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-resolution"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
