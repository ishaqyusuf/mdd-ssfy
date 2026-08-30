import { describe, expect, test } from "bun:test";
import { projectCanonicalLegacySalesPaymentSource } from "./canonical-mirror";

describe("projectCanonicalLegacySalesPaymentSource", () => {
	test("projects paid, unpaid, and refunded successful legacy evidence", () => {
		expect(
			projectCanonicalLegacySalesPaymentSource({
				grandTotal: 100,
				payments: [],
			}),
		).toEqual({
			totalRecorded: 0,
			totalAllocated: 0,
			totalRefunded: 0,
			totalVoided: 0,
			amountDue: 100,
		});
		expect(
			projectCanonicalLegacySalesPaymentSource({
				grandTotal: 100,
				payments: [
					{ amount: 120, status: "success", deletedAt: null },
					{ amount: -20, status: "success", deletedAt: null },
				],
			}),
		).toEqual({
			totalRecorded: 120,
			totalAllocated: 120,
			totalRefunded: 20,
			totalVoided: 0,
			amountDue: 0,
		});
	});

	test("ignores cancelled, null-status, and deleted legacy rows", () => {
		expect(
			projectCanonicalLegacySalesPaymentSource({
				grandTotal: 100,
				payments: [
					{ amount: 100, status: "cancelled", deletedAt: null },
					{ amount: 100, status: null, deletedAt: null },
					{ amount: 100, status: "success", deletedAt: new Date() },
					{ amount: 40, status: "SUCCESS", deletedAt: null },
				],
			}),
		).toMatchObject({ totalRecorded: 40, totalAllocated: 40, amountDue: 60 });
	});
});
