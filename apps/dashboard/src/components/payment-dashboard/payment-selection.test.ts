import { describe, expect, it } from "bun:test";
import { getPaymentSelection } from "./payment-selection";

describe("payout review selection", () => {
	it("uses the same current rows for the displayed amount and submitted job IDs", () => {
		const result = getPaymentSelection(
			[
				{ id: 11, amount: 120 },
				{ id: 12, amount: 75 },
			],
			{ "11": true, "12": false, "99": true },
			10,
		);
		expect(result.selectedJobIds).toEqual([11]);
		expect(result.selectedTotal).toBe(120);
		expect(result.discountValue).toBe(12);
		expect(result.totalPayout).toBe(108);
	});

	it("drops filtered or no-longer-unpaid rows from both the amount and submitted IDs", () => {
		const result = getPaymentSelection(
			[{ id: 12, amount: 75 }],
			{ "11": true },
			5,
		);
		expect(result.selectedJobIds).toEqual([]);
		expect(result.totalPayout).toBe(0);
	});

	it("rounds the profile discount and final payout to cents", () => {
		const result = getPaymentSelection(
			[
				{ id: 11, amount: 123.45 },
				{ id: 12, amount: 10.15 },
			],
			{ "11": true, "12": true },
			7.5,
		);
		expect(result.selectedTotal).toBe(133.6);
		expect(result.discountValue).toBe(10.02);
		expect(result.totalPayout).toBe(123.58);
	});
});
