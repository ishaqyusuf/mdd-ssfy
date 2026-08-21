import { describe, expect, test } from "bun:test";
import { salesCheckoutSuccess } from "../src/types/sales-checkout-success";
import { salesPaymentRecorded } from "../src/types/sales-payment-recorded";
import { salesPaymentRefunded } from "../src/types/sales-payment-refunded";

const author = { id: 9 } as never;

describe("sales payment activity", () => {
	test("persists checkout, payment, and refund activity without a contact", () => {
		expect(salesCheckoutSuccess.createActivityWithoutContact).toBe(true);
		expect(salesPaymentRecorded.createActivityWithoutContact).toBe(true);
		expect(salesPaymentRefunded.createActivityWithoutContact).toBe(true);
	});

	test("tags recorded payments with every sales overview identity", () => {
		const activity = salesPaymentRecorded.createActivity(
			{
				salesId: 23521,
				orderNo: "09396PC",
				amount: 20,
				paymentMethod: "terminal",
			},
			author,
			author,
		);

		expect(activity.tags).toMatchObject({
			salesId: 23521,
			salesNo: "09396PC",
			orderNo: "09396PC",
		});
	});

	test("tags refunds with every sales overview identity", () => {
		const activity = salesPaymentRefunded.createActivity(
			{
				salesId: 23521,
				orderNo: "09396PC",
				amount: 4,
				reason: "Refund overpayment",
			},
			author,
			author,
		);

		expect(activity.tags).toMatchObject({
			salesId: 23521,
			salesNo: "09396PC",
			orderNo: "09396PC",
		});
	});
});
