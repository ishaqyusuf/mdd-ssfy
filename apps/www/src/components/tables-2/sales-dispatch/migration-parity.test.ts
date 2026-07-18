import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Dispatch Sales Orders table migration parity", () => {
	it("keeps all dispatch routes on the tables-2 module with saved table settings", () => {
		const dispatchRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/dispatch/page.tsx",
		);
		const adminRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/dispatch-admin/page.tsx",
		);
		const taskRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/dispatch-task/page.tsx",
		);
		const routeSource = `${dispatchRoute}\n${adminRoute}\n${taskRoute}`;

		expect(routeSource.includes("components/tables-2/sales-dispatch")).toBe(
			true,
		);
		expect(
			routeSource.includes('getInitialTableSettings("sales-dispatch")'),
		).toBe(true);
		expect(routeSource.includes("components/tables/sales-dispatch")).toBe(
			false,
		);
		expect(routeSource.includes("@gnd/ui/data-table")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(dispatchRoute.includes("batchPrefetch([")).toBe(true);
		expect(adminRoute.includes("DispatchCalendarView")).toBe(true);
		expect(taskRoute.includes("<DataTable driver")).toBe(true);
	});

	it("keeps the table-owned scroll, header offset, DnD, selection, and bottom-bar behavior from Sales Orders", () => {
		const source = readSource(
			"components/tables-2/sales-dispatch/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-dispatch-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar data={tableData} />")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact header drag sorting hooks, select-all, action header, and resize behavior", () => {
		const source = readSource(
			"components/tables-2/sales-dispatch/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("useSortQuery")).toBe(true);
		expect(source.includes("table.toggleAllPageRowsSelected")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Sales Dispatch registered for compact table settings and content-tailored widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/sales-dispatch/columns.tsx",
		);

		expect(settingsSource.includes('| "sales-dispatch"')).toBe(true);
		expect(configSource.includes('"sales-dispatch": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-dispatch"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(118, 180, 136)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(140, 230, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 360, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(132, 220, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(118, 180, 132)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(116, 170, 132)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(72, 72)")).toBe(true);
	});
});
