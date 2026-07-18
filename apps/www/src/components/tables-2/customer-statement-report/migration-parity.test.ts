import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Customer statement report table migration parity", () => {
	it("moves the Sales Report customer statement dialog off inline table markup", () => {
		const source = readSource("components/sales-report-menu.tsx");

		expect(source.includes("CustomerStatementReportDataTable")).toBe(true);
		expect(source.includes("CustomerStatementLinesDataTable")).toBe(true);
		expect(source.includes('@gnd/ui/table"')).toBe(false);
		expect(source.includes("<Table>")).toBe(false);
		expect(source.includes("<TableHeader")).toBe(false);
		expect(source.includes("<TableBody")).toBe(false);
		expect(source.includes("<TableFooter")).toBe(false);
		expect(source.includes("<TableRow")).toBe(false);
		expect(source.includes("<TableCell")).toBe(false);
	});

	it("keeps customer statement report table-core mechanics and row open behavior", () => {
		const source = readSource(
			"components/tables-2/customer-statement-report/data-table.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/customer-statement-report/columns.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="customer-statement-report-table-dnd"')).toBe(
			true,
		);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("onOpenCustomer(row.original.customerId)")).toBe(
			true,
		);
		expect(columnsSource.includes("onOpenCustomer")).toBe(true);
	});

	it("keeps customer statement lines selection on table-core mechanics", () => {
		const source = readSource(
			"components/tables-2/customer-statement-lines/data-table.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/customer-statement-lines/table-header.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/customer-statement-lines/columns.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="customer-statement-lines-table-dnd"')).toBe(
			true,
		);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("isSelected={selectedLineSet.has")).toBe(true);
		expect(headerSource.includes("Select all statement lines")).toBe(true);
		expect(headerSource.includes("toggleAllLines")).toBe(true);
		expect(columnsSource.includes("toggleLine")).toBe(true);
		expect(columnsSource.includes("selectedLineSet")).toBe(true);
	});

	it("registers compact tailored customer statement widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const reportColumnsSource = readSource(
			"components/tables-2/customer-statement-report/columns.tsx",
		);
		const lineColumnsSource = readSource(
			"components/tables-2/customer-statement-lines/columns.tsx",
		);

		expect(settingsSource.includes('| "customer-statement-report"')).toBe(true);
		expect(settingsSource.includes('| "customer-statement-lines"')).toBe(true);
		expect(configSource.includes('"customer-statement-report": {')).toBe(true);
		expect(configSource.includes('"customer-statement-lines": {')).toBe(true);
		expect(configSource.includes('tableId: "customer-statement-report"')).toBe(
			true,
		);
		expect(configSource.includes('tableId: "customer-statement-lines"')).toBe(
			true,
		);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes("rowHeight: 48")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(reportColumnsSource.includes("sizes.custom(220, 420, 280)")).toBe(
			true,
		);
		expect(reportColumnsSource.includes("sizes.custom(108, 150, 124)")).toBe(
			true,
		);
		expect(lineColumnsSource.includes("sizes.custom(112, 170, 132)")).toBe(
			true,
		);
		expect(lineColumnsSource.includes("sizes.custom(180, 320, 230)")).toBe(
			true,
		);
		expect(lineColumnsSource.includes("sizes.custom(104, 148, 120)")).toBe(
			true,
		);
	});
});
