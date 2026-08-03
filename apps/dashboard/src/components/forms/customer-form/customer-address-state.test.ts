import { describe, expect, it } from "bun:test";
import {
	createShippingDraft,
	isShippingSameAsBilling,
} from "./customer-address-state";

describe("customer dual address form state", () => {
	it("checks same as billing only when both assigned ids match", () => {
		expect(isShippingSameAsBilling(201, 201)).toBe(true);
		expect(isShippingSameAsBilling(201, 909)).toBe(false);
		expect(isShippingSameAsBilling(201, null)).toBe(false);
		expect(isShippingSameAsBilling(null, null)).toBe(false);
	});

	it("prefills a newly revealed shipping draft without reusing the billing id", () => {
		expect(
			createShippingDraft({
				addressId: 201,
				address1: "100 Billing Ave",
				city: "Austin",
				state: "TX",
				zip_code: "78701",
			}),
		).toEqual({
			addressId: null,
			address1: "100 Billing Ave",
			city: "Austin",
			state: "TX",
			zip_code: "78701",
		});
	});
});
