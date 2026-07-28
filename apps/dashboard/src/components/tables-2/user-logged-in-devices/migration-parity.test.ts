import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("User logged-in devices table migration parity", () => {
	it("moves the settings profile sessions table off the inline table", () => {
		const pageSource = readSource("app/(sidebar)/settings/profile/page.tsx");
		const componentSource = readSource("components/user-logged-in-devices.tsx");

		expect(pageSource.includes("getInitialTableSettings")).toBe(true);
		expect(pageSource.includes('"user-logged-in-devices"')).toBe(true);
		expect(
			pageSource.includes("initialSettings={loggedInDevicesSettings}"),
		).toBe(true);
		expect(componentSource.includes("UserLoggedInDevicesDataTable")).toBe(true);
		expect(
			componentSource.includes("UserLoggedInDevicesColumnVisibility"),
		).toBe(true);
		expect(componentSource.includes('@gnd/ui/table"')).toBe(false);
		expect(componentSource.includes("<Table>")).toBe(false);
		expect(componentSource.includes("<TableHeader")).toBe(false);
		expect(componentSource.includes("<TableBody")).toBe(false);
		expect(componentSource.includes("<TableRow")).toBe(false);
		expect(componentSource.includes("<TableCell")).toBe(false);
		expect(componentSource.includes("DataSkeletonProvider")).toBe(false);
		expect(componentSource.includes("skeletonListData")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, persisted settings, and actions", () => {
		const source = readSource(
			"components/tables-2/user-logged-in-devices/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="user-logged-in-devices-table-dnd"')).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("onLogOutDevice")).toBe(true);
	});

	it("keeps compact headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/user-logged-in-devices/table-header.tsx",
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

	it("registers compact tailored logged-in-device widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/user-logged-in-devices/columns.tsx",
		);

		expect(settingsSource.includes('| "user-logged-in-devices"')).toBe(true);
		expect(configSource.includes('"user-logged-in-devices": {')).toBe(true);
		expect(configSource.includes('tableId: "user-logged-in-devices"')).toBe(
			true,
		);
		expect(configSource.includes("rowHeight: 40")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(140, 240, 170)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(120, 190, 140)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(132, 210, 154)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(56, 80, 64)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:left-0")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
