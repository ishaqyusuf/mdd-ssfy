import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Production Sales Orders table migration parity", () => {
	it("keeps both production routes on the restarted Sales Orders-style shell", () => {
		const routes = [
			"app/(sidebar)/(sales-production-worker)/production/dashboard/page.tsx",
			"app/(sidebar)/(sales-production-worker)/production/dashboard/v2/page.tsx",
			"app/(clean-code)/(sales)/sales-book/(pages)/production-tasks/page.tsx",
			"app/(sidebar)/(sales)/sales-book/productions/v2/page.tsx",
		];

		for (const route of routes) {
			const source = readSource(route);

			expect(source.includes("ScrollableContent")).toBe(true);
			expect(source.includes("HydrateClient")).toBe(true);
			expect(source.includes("batchPrefetch([")).toBe(true);
			expect(
				source.includes('getInitialTableSettings("sales-production")'),
			).toBe(true);
			expect(source.includes("ProductionWorkspace")).toBe(true);
			expect(
				source.includes("initialTableSettings={initialTableSettings}"),
			).toBe(true);
			expect(source.includes("ScrollableContent")).toBe(true);
			expect(source.includes("batchPrefetch([")).toBe(true);
			expect(source.includes("getQueryClient")).toBe(false);
			expect(source.includes("fetchInfiniteQuery")).toBe(false);
			expect(source.includes("productionsV2")).toBe(false);
			expect(source.includes("LazyProduction")).toBe(false);
			expect(source.includes("PageStickyHeader")).toBe(false);
			expect(source.includes("@gnd/ui/data-table")).toBe(false);
		}
	});

	it("keeps the production workspace on the new tables-2 surface with compact table padding", () => {
		const source = readSource("components/production-workspace.tsx");

		expect(
			source.includes("components/tables-2/sales-production/data-table"),
		).toBe(true);
		expect(source.includes("SalesProductionColumnVisibility")).toBe(true);
		expect(source.includes("SalesProductionSkeleton")).toBe(true);
		expect(source.includes('className="flex flex-col gap-3"')).toBe(true);
		expect(source.includes("initialTableSettings")).toBe(true);
		expect(
			source.includes("components/tables/sales-production/data-table"),
		).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize state, and worker/admin query support", () => {
		const source = readSource(
			"components/tables-2/sales-production/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-production-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("useTableScroll")).toBe(true);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("trpc.sales.productionTasks")).toBe(true);
		expect(source.includes("trpc.sales.productions")).toBe(true);
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
			"components/tables-2/sales-production/table-header.tsx",
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

	it("keeps Sales Production registered for compact settings and tailored column widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/sales-production/columns.tsx",
		);

		expect(settingsSource.includes('| "sales-production"')).toBe(true);
		expect(configSource.includes('"sales-production": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-production"')).toBe(true);
		expect(configSource.includes('id: "dueDate"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(140, 200, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(110, 170, 130)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(190, 340, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(170, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(72, 96, 80)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
