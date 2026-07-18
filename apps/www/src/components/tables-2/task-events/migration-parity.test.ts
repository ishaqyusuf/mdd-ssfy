import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Task Events Sales Orders table migration parity", () => {
	it("keeps the task events route on the restarted table shell", () => {
		const routeSource = readSource("app/(sidebar)/task-events/page.tsx");
		const dashboardSource = readSource(
			"app/(sidebar)/task-events/_components/task-events-dashboard.tsx",
		);

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(routeSource.includes('getInitialTableSettings("task-events")')).toBe(
			true,
		);
		expect(routeSource.includes("TaskEventsSkeleton")).toBe(true);
		expect(dashboardSource.includes("TaskEventsColumnVisibility")).toBe(true);
		expect(
			dashboardSource.includes("components/tables-2/task-events/data-table"),
		).toBe(true);
		expect(dashboardSource.includes("useSuspenseQuery")).toBe(true);
		expect(dashboardSource.includes("filteredEvents.map")).toBe(false);
		expect(dashboardSource.includes("rounded-lg border bg-card p-4")).toBe(
			false,
		);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and persisted settings", () => {
		const source = readSource("components/tables-2/task-events/data-table.tsx");

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="task-events-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact content-fit columns, open action, and table registration", () => {
		const columnsSource = readSource(
			"components/tables-2/task-events/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/task-events/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(260, 520, 340)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(150, 240, 170)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(108, 150, 124)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(96, 128, 108)")).toBe(true);
		expect(
			columnsSource.includes("href={`/task-events/${row.original.eventName}`"),
		).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "task-events"')).toBe(true);
		expect(configSource.includes('"task-events": {')).toBe(true);
		expect(configSource.includes('tableId: "task-events"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
