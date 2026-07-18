import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Rep design activity table migration parity", () => {
	it("moves the design page recent activity surface off inline table markup", () => {
		const source = readSource(
			"app/(sidebar)/(sales)/sales-rep/design/page.tsx",
		);
		const normalizedSource = source.replace(/\s+/g, "");

		expect(source.includes("SalesRepDesignActivityDataTable")).toBe(true);
		expect(
			normalizedSource.includes(
				'getInitialTableSettings("sales-rep-design-activity"',
			),
		).toBe(true);
		expect(source.includes('@gnd/ui/table"')).toBe(false);
		expect(source.includes("<Table")).toBe(false);
		expect(source.includes("<TableHeader")).toBe(false);
		expect(source.includes("<TableBody")).toBe(false);
		expect(source.includes("<TableRow")).toBe(false);
		expect(source.includes("<TableCell")).toBe(false);
	});

	it("keeps the activity table on table-core mechanics", () => {
		const source = readSource(
			"components/tables-2/sales-rep-design-activity/data-table.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/sales-rep-design-activity/table-header.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-rep-design-activity-table-dnd"')).toBe(
			true,
		);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("useTableSettings")).toBe(true);
		expect(source.includes("useTableScroll")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
	});

	it("registers compact content-tailored design activity widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/sales-rep-design-activity/columns.tsx",
		);

		expect(settingsSource.includes('| "sales-rep-design-activity"')).toBe(true);
		expect(configSource.includes('"sales-rep-design-activity": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-rep-design-activity"')).toBe(
			true,
		);
		expect(configSource.includes("rowHeight: 48")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 170, 132)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(170, 300, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 340, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 150, 126)")).toBe(true);
	});
});
