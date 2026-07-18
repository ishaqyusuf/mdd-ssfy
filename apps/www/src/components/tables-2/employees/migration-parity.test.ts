import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Employees Sales Orders table migration parity", () => {
	it("keeps the route shell aligned with Sales Orders without the shared sticky header abstraction", () => {
		const source = readSource("app/(sidebar)/hrm/employees/page.tsx");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("<PageTitle>Employee</PageTitle>")).toBe(true);
		expect(source.includes("<EmployeeHeader />")).toBe(true);
		expect(
			source.includes("<DataTable initialSettings={initialSettings} />"),
		).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(source.includes('getInitialTableSettings("employees")')).toBe(true);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("components/tables/employees")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps the Employees v2 list route on the restarted table shell", () => {
		const routeSource = readSource("app/(sidebar)/hrm/employees/v2/page.tsx");
		const listSource = readSource(
			"features/employee-management/components/employee-list-page.tsx",
		);
		const source = `${routeSource}\n${listSource}`;

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(routeSource.includes('getInitialTableSettings("employees")')).toBe(
			true,
		);
		expect(source.includes("components/tables-2/employees/data-table")).toBe(
			true,
		);
		expect(source.includes("components/tables-2/employees/skeleton")).toBe(
			true,
		);
		expect(source.includes("components/tables/employees")).toBe(false);
		expect(source.includes("components/tables/skeleton")).toBe(false);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps the table-owned scroll and column-drag behavior from Sales Orders", () => {
		const source = readSource("components/tables-2/employees/data-table.tsx");

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="employees-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps header drag sorting hooks and resize behavior on the table header", () => {
		const source = readSource("components/tables-2/employees/table-header.tsx");

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("useSortQuery")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Employees registered for table settings and row height config", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(settingsSource.includes('| "employees"')).toBe(true);
		expect(configSource.includes("employees: {")).toBe(true);
		expect(configSource.includes('tableId: "employees"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
	});

	it("keeps Super Admin bug-report access controls in the employee table", () => {
		const columnsSource = readSource(
			"components/tables-2/employees/columns.tsx",
		);

		expect(columnsSource.includes('id: "bugReports"')).toBe(true);
		expect(columnsSource.includes('header: "Bug Reports"')).toBe(true);
		expect(columnsSource.includes("row.bugReportingEnabled")).toBe(true);
		expect(columnsSource.includes("setEmployeeBugReportingAccess")).toBe(true);
		expect(columnsSource.includes("Enable Bug Reports")).toBe(true);
		expect(columnsSource.includes("Disable Bug Reports")).toBe(true);
		expect(columnsSource.includes("Bug Reports Enabled By Role")).toBe(true);
		expect(
			columnsSource.includes(
				"disabled={isSuperAdminEmployee || bugReportAccess.isPending}",
			),
		).toBe(true);
	});
});
