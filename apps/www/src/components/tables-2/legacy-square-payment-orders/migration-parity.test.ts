import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Legacy Square payment orders table migration parity", () => {
	it("moves the fallback multi-order checkout table off the inline table", () => {
		const pageSource = readSource(
			"app/(payment)/square-payment/[emailToken]/[orderIds]/legacy-square-payment-page.tsx",
		);

		expect(pageSource.includes("LegacySquarePaymentOrdersDataTable")).toBe(
			true,
		);
		expect(pageSource.includes('@gnd/ui/table"')).toBe(false);
		expect(pageSource.includes("<Table>")).toBe(false);
		expect(pageSource.includes("<TableHeader")).toBe(false);
		expect(pageSource.includes("<TableBody")).toBe(false);
		expect(pageSource.includes("<TableRow")).toBe(false);
		expect(pageSource.includes("<TableCell")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and persisted settings", () => {
		const source = readSource(
			"components/tables-2/legacy-square-payment-orders/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="legacy-square-payment-orders-table-dnd"')).toBe(
			true,
		);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("startFromColumn: 1")).toBe(true);
	});

	it("registers compact tailored checkout widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/legacy-square-payment-orders/columns.tsx",
		);

		expect(settingsSource.includes('| "legacy-square-payment-orders"')).toBe(
			true,
		);
		expect(configSource.includes('"legacy-square-payment-orders": {')).toBe(
			true,
		);
		expect(
			configSource.includes('tableId: "legacy-square-payment-orders"'),
		).toBe(true);
		expect(configSource.includes("rowHeight: 40")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 160, 128)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(170, 260, 210)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(92, 128, 104)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:left-0")).toBe(true);
	});
});
