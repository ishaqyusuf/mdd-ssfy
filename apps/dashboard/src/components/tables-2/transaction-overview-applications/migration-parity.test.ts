import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Transaction overview modal table migration parity", () => {
	it("moves the modal off inline table markup", () => {
		const modalSource = readSource(
			"components/modals/transaction-overview-modal.tsx",
		);
		const layoutSource = readSource("app/(clean-code)/layout.tsx");

		expect(
			modalSource.includes("TransactionOverviewApplicationsDataTable"),
		).toBe(true);
		expect(modalSource.includes("TransactionOverviewPaymentsDataTable")).toBe(
			true,
		);
		expect(layoutSource.includes('"transaction-overview-applications"')).toBe(
			true,
		);
		expect(layoutSource.includes('"transaction-overview-payments"')).toBe(true);
		expect(modalSource.includes('@gnd/ui/table"')).toBe(false);
		expect(/<Table[\s>]/.test(modalSource)).toBe(false);
		expect(/<TableHeader[\s>]/.test(modalSource)).toBe(false);
		expect(/<TableBody[\s>]/.test(modalSource)).toBe(false);
		expect(/<TableRow[\s>]/.test(modalSource)).toBe(false);
		expect(/<TableCell[\s>]/.test(modalSource)).toBe(false);
	});

	it("keeps both modal tables on table-core mechanics", () => {
		const applicationsSource = readSource(
			"components/tables-2/transaction-overview-applications/data-table.tsx",
		);
		const paymentsSource = readSource(
			"components/tables-2/transaction-overview-payments/data-table.tsx",
		);
		const applicationsHeaderSource = readSource(
			"components/tables-2/transaction-overview-applications/table-header.tsx",
		);
		const paymentsHeaderSource = readSource(
			"components/tables-2/transaction-overview-payments/table-header.tsx",
		);

		for (const source of [applicationsSource, paymentsSource]) {
			expect(source.includes("VirtualRow")).toBe(true);
			expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
			expect(source.includes("useTableDnd(table)")).toBe(true);
			expect(source.includes("<DndContext")).toBe(true);
			expect(source.includes("enableColumnResizing: true")).toBe(true);
			expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(
				true,
			);
			expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
			expect(source.includes("useTableSettings")).toBe(true);
			expect(source.includes("useTableScroll")).toBe(true);
			expect(source.includes("onOpenSale(")).toBe(true);
		}
		expect(
			applicationsSource.includes(
				'id="transaction-overview-applications-table-dnd"',
			),
		).toBe(true);
		expect(
			paymentsSource.includes('id="transaction-overview-payments-table-dnd"'),
		).toBe(true);
		expect(applicationsHeaderSource.includes("DraggableHeader")).toBe(true);
		expect(applicationsHeaderSource.includes("ResizeHandle")).toBe(true);
		expect(paymentsHeaderSource.includes("DraggableHeader")).toBe(true);
		expect(paymentsHeaderSource.includes("ResizeHandle")).toBe(true);
	});

	it("registers compact tailored transaction overview widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const applicationColumnsSource = readSource(
			"components/tables-2/transaction-overview-applications/columns.tsx",
		);
		const paymentColumnsSource = readSource(
			"components/tables-2/transaction-overview-payments/columns.tsx",
		);

		expect(
			settingsSource.includes('| "transaction-overview-applications"'),
		).toBe(true);
		expect(settingsSource.includes('| "transaction-overview-payments"')).toBe(
			true,
		);
		expect(
			configSource.includes('"transaction-overview-applications": {'),
		).toBe(true);
		expect(configSource.includes('"transaction-overview-payments": {')).toBe(
			true,
		);
		expect(configSource.includes("rowHeight: 40")).toBe(true);
		expect(configSource.includes("rowHeight: 48")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(
			applicationColumnsSource.includes("sizes.custom(104, 150, 118)"),
		).toBe(true);
		expect(
			applicationColumnsSource.includes("sizes.custom(108, 145, 120)"),
		).toBe(true);
		expect(paymentColumnsSource.includes("sizes.custom(108, 150, 124)")).toBe(
			true,
		);
		expect(paymentColumnsSource.includes("sizes.custom(220, 380, 270)")).toBe(
			true,
		);
		expect(paymentColumnsSource.includes("sizes.custom(48, 56, 52)")).toBe(
			true,
		);
	});
});
