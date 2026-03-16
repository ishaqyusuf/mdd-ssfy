import { describe, expect, it } from "bun:test";
import { classifyOrderPaymentConflict } from "./classify-order-payment-conflict";

describe("resolution-system payment conflict classifier", () => {
	it("flags overpayment when stored due is negative", () => {
		expect(
			classifyOrderPaymentConflict({
				paidAmount: 120,
				storedAmountDue: -20,
				calculatedAmountDue: 0,
				paymentAmounts: [120],
			}).status,
		).toBe("overpayment");
	});

	it("flags duplicate payments before stale due mismatch", () => {
		expect(
			classifyOrderPaymentConflict({
				paidAmount: 200,
				storedAmountDue: 100,
				calculatedAmountDue: 50,
				paymentAmounts: [100, 100],
			}).status,
		).toBe("duplicate payments");
	});

	it("flags stale due when stored and calculated due drift", () => {
		expect(
			classifyOrderPaymentConflict({
				paidAmount: 150,
				storedAmountDue: 100,
				calculatedAmountDue: 50,
				paymentAmounts: [100, 50],
			}).status,
		).toBe("payment not up to date");
	});
});
