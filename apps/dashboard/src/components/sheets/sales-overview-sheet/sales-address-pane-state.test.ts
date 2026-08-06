import { describe, expect, it } from "bun:test";
import { createSalesAddressPaneDraft } from "./sales-address-pane-state";

describe("sales address pane state", () => {
	it("prefills an added shipping address without reusing the billing id", () => {
		expect(
			createSalesAddressPaneDraft({
				addressId: null,
				billingAddress: {
					addressId: 201,
					address1: "100 Billing Ave",
					city: "Austin",
					name: "Billing Recipient",
				},
			}),
		).toMatchObject({
			addressId: undefined,
			address1: "100 Billing Ave",
			addressOnly: true,
			city: "Austin",
			name: "Billing Recipient",
		});
	});

	it("retains the assigned id when editing an address", () => {
		expect(
			createSalesAddressPaneDraft({
				addressId: 909,
				billingAddress: { addressId: 201, address1: "Billing" },
				selectedAddress: {
					addressId: 909,
					address1: "Shipping",
					name: "Shipping Recipient",
				},
			}),
		).toMatchObject({
			addressId: 909,
			address1: "Shipping",
			name: "Shipping Recipient",
		});
	});
});
