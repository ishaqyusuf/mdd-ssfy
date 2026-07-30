import { describe, expect, it } from "bun:test";

import {
	type SalesFinanceTransactionSource,
	projectSalesFinanceTransaction,
} from "./projection";
import {
	applySalesFinanceReconciliation,
	buildSalesFinanceReconciliationFingerprint,
} from "./reconciliation";

function transaction(overrides: Partial<SalesFinanceTransactionSource> = {}) {
	return projectSalesFinanceTransaction({
		id: 44,
		txId: "PAY-44",
		status: "success",
		amount: 100,
		paymentMethod: "check",
		createdAt: new Date("2026-07-29"),
		wallet: {
			accountNo: "555-0100",
			customer: { id: 1, businessName: "Acme", name: "Ada" },
		},
		salesPayments: [],
		...overrides,
	});
}

describe("Sales Finance reconciliation evidence", () => {
	it("keeps unreviewed exceptions in the review queue", () => {
		const result = applySalesFinanceReconciliation(transaction(), []);

		expect(result.rawNeedsReview).toBe(true);
		expect(result.needsReview).toBe(true);
		expect(result.reconciliationStatus).toBe("unreviewed");
	});

	it("marks matching opened evidence in progress without hiding the exception", () => {
		const payment = transaction();
		const result = applySalesFinanceReconciliation(payment, [
			{
				id: 1,
				userId: 7,
				createdAt: new Date("2026-07-29T12:00:00.000Z"),
				data: {
					action: "opened",
					fingerprint: buildSalesFinanceReconciliationFingerprint(payment),
					note: "Checking deposit slip.",
				},
			},
		]);

		expect(result.needsReview).toBe(true);
		expect(result.reconciliationStatus).toBe("in_progress");
		expect(result.reconciliationNote).toBe("Checking deposit slip.");
	});

	it("hides only a matching latest resolution from the effective review queue", () => {
		const payment = transaction();
		const fingerprint = buildSalesFinanceReconciliationFingerprint(payment);
		const result = applySalesFinanceReconciliation(payment, [
			{
				id: 1,
				userId: 7,
				createdAt: new Date("2026-07-29T12:00:00.000Z"),
				data: { action: "opened", fingerprint },
			},
			{
				id: 2,
				userId: 8,
				createdAt: new Date("2026-07-29T13:00:00.000Z"),
				data: {
					action: "resolved",
					fingerprint,
					note: "Reference verified against the deposit.",
					resolution: "verified",
				},
			},
		]);

		expect(result.rawNeedsReview).toBe(true);
		expect(result.needsReview).toBe(false);
		expect(result.reconciliationStatus).toBe("resolved");
		expect(result.reconciliationResolution).toBe("verified");
		expect(result.reconciledById).toBe(8);
	});

	it("makes prior resolution stale when source evidence changes", () => {
		const original = transaction();
		const changed = transaction({ txId: "PAY-CHANGED" });
		const result = applySalesFinanceReconciliation(changed, [
			{
				id: 2,
				userId: 8,
				createdAt: new Date("2026-07-29T13:00:00.000Z"),
				data: {
					action: "resolved",
					fingerprint: buildSalesFinanceReconciliationFingerprint(original),
					resolution: "verified",
				},
			},
		]);

		expect(result.needsReview).toBe(true);
		expect(result.reconciliationStatus).toBe("stale");
	});
});
