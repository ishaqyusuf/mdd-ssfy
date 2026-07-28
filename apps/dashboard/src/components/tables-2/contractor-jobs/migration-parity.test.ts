import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Contractor Jobs Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without the shared sticky header abstraction", () => {
		const source = readSource("app/(sidebar)/hrm/contractors/jobs/page.tsx");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("<PageTitle>Job</PageTitle>")).toBe(true);
		expect(source.includes("<JobHeader />")).toBe(true);
		expect(source.includes("<JobsKpiWidget />")).toBe(true);
		expect(
			source.includes("<DataTable initialSettings={initialSettings} />"),
		).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("contractor-jobs")')).toBe(
			true,
		);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/contractor-jobs")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps shared page tabs without the legacy jobs tab dependencies", () => {
		const source = readSource("components/contractor-jobs-header.tsx");

		expect(source.includes("SearchFilterAdapter")).toBe(true);
		expect(source.includes("<SearchFilter")).toBe(true);
		expect(source.includes("useJobsKpi")).toBe(false);
		expect(source.includes("useQueryStates")).toBe(false);
		expect(source.includes("ButtonGroup")).toBe(false);
		expect(source.includes("showingCustom")).toBe(false);
	});

	it("keeps the table-owned scroll, column-drag, selection, and bottom-bar behavior from Sales Orders", () => {
		const source = readSource(
			"components/tables-2/contractor-jobs/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="contractor-jobs-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar data={tableData} />")).toBe(true);
		expect(source.includes("embedded ? null : showBottomBar")).toBe(true);
		expect(source.includes("columns: activeColumns")).toBe(true);
		expect(source.includes("columns?: ColumnDef<JobRow>[]")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps header drag sorting hooks, select-all, action header, and resize behavior", () => {
		const source = readSource(
			"components/tables-2/contractor-jobs/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("useSortQuery")).toBe(true);
		expect(source.includes("table.toggleAllPageRowsSelected")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Contractor Jobs registered for table settings and row height config", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(settingsSource.includes('| "contractor-jobs"')).toBe(true);
		expect(configSource.includes('"contractor-jobs": {')).toBe(true);
		expect(configSource.includes('tableId: "contractor-jobs"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
	});

	it("keeps the worker jobs dashboard list on the restarted contractor jobs table", () => {
		const routeSource = readSource(
			"app/(sidebar)/(jobs-dashboard)/jobs-dashboard/jobs-list/page.tsx",
		);
		const listSource = readSource(
			"components/jobs-dashboard/worker-jobs-list.tsx",
		);
		const columnSource = readSource(
			"components/tables-2/contractor-jobs/columns.tsx",
		);
		const skeletonSource = readSource(
			"components/tables-2/contractor-jobs/skeleton.tsx",
		);

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			routeSource.includes('getInitialTableSettings("contractor-jobs")'),
		).toBe(true);
		expect(routeSource.includes("fetchInfiniteQuery")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("ContractorJobsSkeleton")).toBe(true);
		expect(
			listSource.includes("components/tables-2/contractor-jobs/data-table"),
		).toBe(true);
		expect(listSource.includes("components/tables/contractor-jobs")).toBe(
			false,
		);
		expect(listSource.includes("workerDashboardColumns")).toBe(true);
		expect(columnSource.includes("export const workerDashboardColumns")).toBe(
			true,
		);
		expect(skeletonSource.includes("columns={activeColumns}")).toBe(true);
	});
});
