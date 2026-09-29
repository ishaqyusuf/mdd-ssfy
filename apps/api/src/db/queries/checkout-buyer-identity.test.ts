import { describe, expect, test } from "bun:test";
import { checkoutBuyerPrepopulatedData } from "./checkout-buyer-identity";

describe("checkout buyer identity", () => {
	test("dealer GND checkout does not transmit the private customer contact", () => {
		expect(
			checkoutBuyerPrepopulatedData({
				identity: "payer-enters-at-checkout",
				email: "private-customer@example.test",
				phone: "+13055550178",
				address: "862 Matthew Ville Suite 783",
			}),
		).toBeUndefined();
	});

	test("ordinary customer checkout retains customer prefill", () => {
		expect(
			checkoutBuyerPrepopulatedData({
				identity: "sale-customer",
				email: "buyer@example.com",
				phone: "+13055550178",
				address: "123 Main St",
			}),
		).toEqual({
			buyerEmail: "buyer@example.com",
			buyerPhoneNumber: "+13055550178",
			buyerAddress: { addressLine1: "123 Main St" },
		});
	});
});
