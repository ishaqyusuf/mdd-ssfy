import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Employee Profiles sheet table migration parity", () => {
	it("keeps the profiles tab off the legacy data-table path", () => {
		const tabSource = readSource(
			"components/sheets/roles-profile-sheet/profiles-tab.tsx",
		);

		expect(
			tabSource.includes("components/tables-2/employee-profiles/data-table"),
		).toBe(true);
		expect(tabSource.includes("EmployeeProfilesColumnVisibility")).toBe(true);
		expect(tabSource.includes("EmployeeProfilesSkeleton")).toBe(true);
		expect(tabSource.includes("Portal")).toBe(true);
		expect(
			tabSource.includes("components/tables/employee-profiles/table"),
		).toBe(false);
		expect(tabSource.includes("@gnd/ui/data-table")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and row edit behavior", () => {
		const source = readSource(
			"components/tables-2/employee-profiles/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="employee-profiles-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("onCellClick={() => onEdit(row.original)}")).toBe(
			true,
		);
		expect(source.includes("clamp(240px")).toBe(true);
	});

	it("keeps profile actions wired to profile params and delete action", () => {
		const tabSource = readSource(
			"components/sheets/roles-profile-sheet/profiles-tab.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/employee-profiles/columns.tsx",
		);

		expect(tabSource.includes("deleteProfileAction")).toBe(true);
		expect(tabSource.includes("deleteRoleAction")).toBe(false);
		expect(tabSource.includes("profileForm: true")).toBe(true);
		expect(tabSource.includes("profileEditId: profile.id")).toBe(true);
		expect(tabSource.includes("roleForm: true")).toBe(false);
		expect(columnsSource.includes("ConfirmBtn")).toBe(true);
		expect(columnsSource.includes("disabled={hasEmployees}")).toBe(true);
	});

	it("keeps compact headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/employee-profiles/table-header.tsx",
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

	it("keeps employee profiles registered with compact tailored column widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/employee-profiles/columns.tsx",
		);

		expect(settingsSource.includes('| "employee-profiles"')).toBe(true);
		expect(configSource.includes('"employee-profiles": {')).toBe(true);
		expect(configSource.includes('tableId: "employee-profiles"')).toBe(true);
		expect(configSource.includes('id: "profile"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(190, 340, 230)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(108, 160, 120)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(126, 190, 144)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 170, 128)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(92, 122, 104)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
