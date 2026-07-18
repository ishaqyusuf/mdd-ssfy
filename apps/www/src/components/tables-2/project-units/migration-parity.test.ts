import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Project Units Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without the shared sticky header abstraction", () => {
		const source = readSource(
			"app/(sidebar)/community/(main)/project-units/page.tsx",
		);

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("<PageTitle>Project Units</PageTitle>")).toBe(true);
		expect(source.includes("<ProjectUnitHeader />")).toBe(true);
		expect(source.includes("<CommunityProjectUnitsAnalyticsCards />")).toBe(
			true,
		);
		expect(
			source.includes("<DataTable initialSettings={initialSettings} />"),
		).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("project-units")')).toBe(
			true,
		);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/project-units")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps the table-owned scroll, column-drag, selection, and bottom-bar behavior from Sales Orders", () => {
		const source = readSource(
			"components/tables-2/project-units/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="project-units-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar data={tableData} />")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes('style: "compact"')).toBe(false);
	});

	it("keeps compact tailored columns, header drag sorting hooks, select-all, action header, and resize behavior", () => {
		const headerSource = readSource(
			"components/tables-2/project-units/table-header.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/project-units/columns.tsx",
		);
		const configSource = readSource("utils/table-configs.ts");

		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("useSortQuery")).toBe(true);
		expect(headerSource.includes("table.toggleAllPageRowsSelected")).toBe(true);
		expect(headerSource.includes("tableConfig.nonReorderableColumns")).toBe(
			true,
		);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 380, 280)")).toBe(true);
		expect(configSource.includes('tableId: "project-units"')).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});

	it("keeps Project Units registered and keeps all Project Overview tabs off legacy tables", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const overviewSource = readSource(
			"components/widgets/project-overview/index.tsx",
		);

		expect(settingsSource.includes('| "project-units"')).toBe(true);
		expect(overviewSource.includes("tables-2/project-units/data-table")).toBe(
			true,
		);
		expect(
			overviewSource.includes("tables-2/unit-productions/data-table"),
		).toBe(true);
		expect(overviewSource.includes("tables-2/unit-invoices/data-table")).toBe(
			true,
		);
		expect(overviewSource.includes("tables-2/contractor-jobs/data-table")).toBe(
			true,
		);
		expect(overviewSource.includes("components/tables/project-units")).toBe(
			false,
		);
		expect(overviewSource.includes("components/tables/unit-productions")).toBe(
			false,
		);
		expect(overviewSource.includes("components/tables/unit-invoices")).toBe(
			false,
		);
		expect(overviewSource.includes("components/tables/contractor-jobs")).toBe(
			false,
		);
	});
});
