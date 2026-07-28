import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Shelf Items Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without manual query fetching", () => {
		const routeSource = readSource(
			"app/(sidebar)/(sales)/sales-book/shelf-items/page.tsx",
		);
		const managerSource = readSource(
			"components/sales-book/shelf-items-manager.tsx",
		);
		const source = `${routeSource}\n${managerSource}`;

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("HydrateClient")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(routeSource.includes('getInitialTableSettings("shelf-items")')).toBe(
			true,
		);
		expect(routeSource.includes("<PageTitle>Shelf Items</PageTitle>")).toBe(
			true,
		);
		expect(source.includes("components/tables-2/shelf-items/data-table")).toBe(
			true,
		);
		expect(source.includes("ShelfItemsColumnVisibility")).toBe(true);
		expect(source.includes("ShelfItemsSkeleton")).toBe(true);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchQuery")).toBe(false);
		expect(source.includes("LazyShelfItemsManager")).toBe(false);
		expect(source.includes("components/tables/skeleton")).toBe(false);
		expect(source.includes("@gnd/ui/table")).toBe(false);
		expect(source.includes("TableRow")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize state, and edit behavior", () => {
		const source = readSource("components/tables-2/shelf-items/data-table.tsx");

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="shelf-items-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("useTableScroll")).toBe(true);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("useSuspenseQuery")).toBe(true);
		expect(source.includes("trpc.salesShelfItems.listProducts")).toBe(true);
		expect(source.includes("useVirtualizer")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("onCellClick={() => onEdit(row.original)}")).toBe(
			true,
		);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
	});

	it("keeps compact draggable headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/shelf-items/table-header.tsx",
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

	it("keeps Shelf Items registered with compact tailored column widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/shelf-items/columns.tsx",
		);

		expect(settingsSource.includes('| "shelf-items"')).toBe(true);
		expect(configSource.includes('"shelf-items": {')).toBe(true);
		expect(configSource.includes('tableId: "shelf-items"')).toBe(true);
		expect(configSource.includes('id: "product"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(200, 360, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(160, 280, 200)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(92, 132, 104)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(128, 220, 150)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 132, 116)")).toBe(true);
		expect(columnsSource.includes("size-8")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
