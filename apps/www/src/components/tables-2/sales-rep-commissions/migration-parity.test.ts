import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Rep commissions table migration parity", () => {
	it("keeps the commission tab off legacy table helpers", () => {
		const routeSource = readSource("app/(sidebar)/(sales)/sales-rep/page.tsx");
		const paymentsSource = readSource(
			"components/sales-rep-commission-payment.tsx",
		);
		const commissionsSource = readSource(
			"components/sales-rep-pending-comissions.tsx",
		);
		const widgetPaymentsSource = readSource(
			"components/widgets/commission-payments/index.tsx",
		);
		const widgetCommissionsSource = readSource(
			"components/widgets/comissions/index.tsx",
		);
		const source = [
			routeSource,
			paymentsSource,
			commissionsSource,
			widgetPaymentsSource,
			widgetCommissionsSource,
		].join("\n");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(
			routeSource.includes(
				'getInitialTableSettings("sales-rep-commission-payments")',
			),
		).toBe(true);
		expect(
			routeSource.includes('getInitialTableSettings("sales-rep-commissions")'),
		).toBe(true);
		expect(
			source.includes(
				"components/tables-2/sales-rep-commission-payments/data-table",
			),
		).toBe(true);
		expect(
			source.includes("components/tables-2/sales-rep-commissions/data-table"),
		).toBe(true);
		expect(source.includes("@gnd/ui/table")).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("components/tables/table-header")).toBe(false);
		expect(source.includes("components/tables/table-row")).toBe(false);
		expect(source.includes("components/tables/action-cell")).toBe(false);
	});

	it("keeps both commission tables on table-core mechanics", () => {
		const paymentTable = readSource(
			"components/tables-2/sales-rep-commission-payments/data-table.tsx",
		);
		const commissionTable = readSource(
			"components/tables-2/sales-rep-commissions/data-table.tsx",
		);

		for (const source of [paymentTable, commissionTable]) {
			expect(source.includes("VirtualRow")).toBe(true);
			expect(source.includes("useScrollHeader(parentRef")).toBe(true);
			expect(source.includes("useTableDnd(table)")).toBe(true);
			expect(source.includes("<DndContext")).toBe(true);
			expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
			expect(source.includes("enableColumnResizing: true")).toBe(true);
			expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(
				true,
			);
			expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
			expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
			expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
				true,
			);
			expect(source.includes("clamp(220px")).toBe(true);
		}
	});

	it("keeps compact tailored columns and settings registration", () => {
		const paymentColumns = readSource(
			"components/tables-2/sales-rep-commission-payments/columns.tsx",
		);
		const commissionColumns = readSource(
			"components/tables-2/sales-rep-commissions/columns.tsx",
		);
		const paymentHeader = readSource(
			"components/tables-2/sales-rep-commission-payments/table-header.tsx",
		);
		const commissionHeader = readSource(
			"components/tables-2/sales-rep-commissions/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(paymentColumns.includes("sizes.custom(150, 240, 170)")).toBe(true);
		expect(paymentColumns.includes("sizes.custom(110, 180, 130)")).toBe(true);
		expect(commissionColumns.includes("sizes.custom(150, 240, 170)")).toBe(
			true,
		);
		expect(commissionColumns.includes("sizes.custom(120, 200, 140)")).toBe(
			true,
		);
		for (const source of [paymentHeader, commissionHeader]) {
			expect(source.includes("SortableContext")).toBe(true);
			expect(source.includes("horizontalListSortingStrategy")).toBe(true);
			expect(source.includes("DraggableHeader")).toBe(true);
			expect(source.includes("ResizeHandle")).toBe(true);
		}
		expect(settingsSource.includes('| "sales-rep-commission-payments"')).toBe(
			true,
		);
		expect(settingsSource.includes('| "sales-rep-commissions"')).toBe(true);
		expect(configSource.includes('"sales-rep-commission-payments": {')).toBe(
			true,
		);
		expect(configSource.includes('"sales-rep-commissions": {')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
