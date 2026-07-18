import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Task Event History Sales Orders table migration parity", () => {
	it("keeps the task event detail route on the restarted table shell", () => {
		const routeSource = readSource(
			"app/(sidebar)/task-events/[eventName]/page.tsx",
		);
		const detailSource = readSource(
			"app/(sidebar)/task-events/_components/task-event-detail.tsx",
		);

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			routeSource.includes('getInitialTableSettings("task-event-history")'),
		).toBe(true);
		expect(routeSource.includes("TaskEventHistorySkeleton")).toBe(true);
		expect(detailSource.includes("TaskEventHistoryColumnVisibility")).toBe(
			true,
		);
		expect(
			detailSource.includes(
				"components/tables-2/task-event-history/data-table",
			),
		).toBe(true);
		expect(detailSource.includes("TaskEventHistoryTable")).toBe(true);
		expect(detailSource.includes("<table")).toBe(false);
		expect(detailSource.includes("<thead")).toBe(false);
		expect(detailSource.includes("<tbody")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and persisted settings", () => {
		const source = readSource(
			"components/tables-2/task-event-history/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="task-event-history-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact content-fit columns and table registration", () => {
		const columnsSource = readSource(
			"components/tables-2/task-event-history/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/task-event-history/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const historyConfig = configSource.slice(
			configSource.indexOf('"task-event-history": {'),
			configSource.indexOf('"document-approvals": {'),
		);

		expect(columnsSource.includes("sizes.custom(136, 210, 156)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(72, 112, 84)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(96, 150, 112)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(300, 700, 460)")).toBe(true);
		expect(columnsSource.includes('contentClassName: "whitespace-normal')).toBe(
			true,
		);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "task-event-history"')).toBe(true);
		expect(configSource.includes('"task-event-history": {')).toBe(true);
		expect(historyConfig.includes('tableId: "task-event-history"')).toBe(true);
		expect(historyConfig.includes("sizes.custom(136, 210, 156)")).toBe(true);
		expect(historyConfig.includes("rowHeight: 112")).toBe(true);
		expect(historyConfig.includes('style: "compact"')).toBe(true);
	});
});
