import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Packing List Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without manual query fetching", () => {
		const routeSource = readSource("app/(sidebar)/sales/packing-list/page.tsx");
		const clientSource = readSource(
			"app/(sidebar)/sales/packing-list/packing-list-client.tsx",
		);
		const source = `${routeSource}\n${clientSource}`;

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("HydrateClient")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			routeSource.includes('getInitialTableSettings("packing-list")'),
		).toBe(true);
		expect(routeSource.includes("PackingListSkeleton")).toBe(true);
		expect(routeSource.includes("PackingListClient")).toBe(true);
		expect(source.includes("components/tables-2/packing-list/data-table")).toBe(
			true,
		);
		expect(source.includes("PackingListColumnVisibility")).toBe(true);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchQuery")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/skeleton")).toBe(false);
		expect(source.includes("PackingListCard")).toBe(false);
		expect(source.includes("CardContent")).toBe(false);
		expect(source.includes("useQuery(")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize state, and row-open behavior", () => {
		const source = readSource(
			"components/tables-2/packing-list/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="packing-list-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("useTableScroll")).toBe(true);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("useSuspenseQuery")).toBe(true);
		expect(source.includes("trpc.dispatch.packingList")).toBe(true);
		expect(source.includes("useVirtualizer")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(
			source.includes(
				'height: "calc(100vh - 350px + var(--header-offset, 0px))"',
			),
		).toBe(true);
	});

	it("keeps compact draggable headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/packing-list/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("HorizontalPagination")).toBe(true);
		expect(source.includes("getTableCellPaddingClass(tableConfig.style)")).toBe(
			true,
		);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Packing List registered with compact tailored column widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/packing-list/columns.tsx",
		);

		expect(settingsSource.includes('| "packing-list"')).toBe(true);
		expect(configSource.includes('"packing-list": {')).toBe(true);
		expect(configSource.includes('tableId: "packing-list"')).toBe(true);
		expect(configSource.includes('id: "orderNo"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(150, 220, 170)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 360, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(240, 480, 320)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(120, 180, 140)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(110, 190, 130)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(110, 160, 120)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(72, 96, 80)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
