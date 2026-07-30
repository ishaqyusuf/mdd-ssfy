import { describe, expect, it } from "bun:test";

import { projectSalesFinanceReceivable } from "./receivables";
import {
	SALES_FINANCE_RECEIVABLE_REPORT_TYPES,
	buildSalesFinanceReceivablesReport,
} from "./receivables-reports";

const asOf = new Date("2026-07-29T12:00:00.000Z");
const receivables = [
	projectSalesFinanceReceivable(
		{
			id: 1,
			orderId: "INV-1",
			createdAt: new Date("2026-06-01"),
			paymentDueDate: new Date("2026-07-15"),
			grandTotal: 1_000,
			amountDue: 600,
			customer: { id: 1, businessName: "Acme", name: "Ada" },
			payments: [{ amount: 400, status: "success" }],
		},
		asOf,
	),
	projectSalesFinanceReceivable(
		{
			id: 2,
			orderId: "INV-2",
			createdAt: new Date("2026-06-02"),
			paymentDueDate: new Date("2026-08-15"),
			grandTotal: 500,
			amountDue: 500,
			customer: { id: 1, businessName: "Acme", name: "Ada" },
			payments: [],
		},
		asOf,
	),
];

describe("Sales Finance receivables Excel reports", () => {
	it("implements each advertised report with context and summary sheets", () => {
		for (const type of SALES_FINANCE_RECEIVABLE_REPORT_TYPES) {
			const report = buildSalesFinanceReceivablesReport({
				type,
				receivables,
				context: {
					q: "Acme",
					agingBuckets: ["current", "1_30"],
				},
				generatedAt: asOf,
			});

			expect(report.rowCount).toBe(2);
			expect(report.sheets[0]?.name).toBe("Report Context");
			expect(report.sheets[1]?.name).toBe("Summary");
			expect(report.sheets.at(-1)?.name).toBe("Outstanding Invoices");
		}
	});

	it("preserves numeric aging totals and auditable customer source rows", () => {
		const report = buildSalesFinanceReceivablesReport({
			type: "receivables-customers",
			receivables,
			context: {},
			generatedAt: asOf,
		});

		expect(report.sheets[1]?.rows[0]).toMatchObject({
			invoices: 2,
			outstanding: 1_100,
			current: 500,
			days1To30: 600,
		});
		expect(report.sheets[2]?.rows[0]).toMatchObject({
			customer: "Acme",
			invoices: 2,
			outstanding: 1_100,
		});
		expect(report.sheets[3]?.rows).toHaveLength(2);
	});
});
