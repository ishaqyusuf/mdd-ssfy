import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Task Run Diagnostics Sales Orders table migration parity", () => {
	it("keeps the diagnostics route on the restarted table shell", () => {
		const routeSource = readSource(
			"app/(sidebar)/task-events/diagnostics/page.tsx",
		);
		const pageSource = readSource(
			"app/(sidebar)/task-events/_components/task-run-diagnostics-dashboard.tsx",
		);

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			routeSource.includes('getInitialTableSettings("task-run-diagnostics")'),
		).toBe(true);
		expect(pageSource.includes("TaskRunDiagnosticsColumnVisibility")).toBe(
			true,
		);
		expect(pageSource.includes("TaskRunDiagnosticsSkeleton")).toBe(true);
		expect(
			pageSource.includes(
				"components/tables-2/task-run-diagnostics/data-table",
			),
		).toBe(true);
		expect(pageSource.includes("@gnd/ui/table")).toBe(false);
		expect(pageSource.includes("@gnd/ui/data-table")).toBe(false);
		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and persisted settings", () => {
		const source = readSource(
			"components/tables-2/task-run-diagnostics/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="task-run-diagnostics-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("useSuspenseQuery")).toBe(true);
	});

	it("keeps compact tailored columns, review action, and table registration", () => {
		const columnsSource = readSource(
			"components/tables-2/task-run-diagnostics/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/task-run-diagnostics/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const diagnosticsConfig = configSource.slice(
			configSource.indexOf('"task-run-diagnostics": {'),
			configSource.indexOf('"task-event-history": {'),
		);

		expect(columnsSource.includes("sizes.custom(128, 196, 148)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 460, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(108, 140, 120)")).toBe(true);
		expect(columnsSource.includes("onMarkReviewed(diagnostic)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "task-run-diagnostics"')).toBe(true);
		expect(configSource.includes('"task-run-diagnostics": {')).toBe(true);
		expect(diagnosticsConfig.includes('tableId: "task-run-diagnostics"')).toBe(
			true,
		);
		expect(diagnosticsConfig.includes("sizes.custom(128, 196, 148)")).toBe(
			true,
		);
		expect(diagnosticsConfig.includes("rowHeight: 56")).toBe(true);
		expect(diagnosticsConfig.includes('style: "compact"')).toBe(true);
	});
});
