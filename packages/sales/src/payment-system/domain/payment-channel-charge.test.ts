import { describe, expect, it } from "bun:test";
import { calculatePaymentChannelCharge } from "./payment-channel-charge";

describe("payment channel charge", () => {
	it("charges ccc on payment links", () => {
		expect(
			calculatePaymentChannelCharge({
				paymentMethod: "link",
				paymentAmount: 500,
				cccPercentage: 3.5,
			}),
		).toMatchObject({
			applies: true,
			baseAmount: 500,
			amount: 17.5,
			chargeAmount: 517.5,
		});
	});

	it("charges ccc on partial card payments only for the paid amount", () => {
		expect(
			calculatePaymentChannelCharge({
				paymentMethod: "credit-card",
				paymentAmount: 500,
				cccPercentage: 3.5,
			}).chargeAmount,
		).toBe(517.5);
	});

	it("does not charge ccc for cash", () => {
		expect(
			calculatePaymentChannelCharge({
				paymentMethod: "cash",
				paymentAmount: 500,
				cccPercentage: 3.5,
			}),
		).toMatchObject({
			applies: false,
			baseAmount: 500,
			amount: 0,
			chargeAmount: 500,
		});
	});
});
