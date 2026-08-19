import { describe, expect, it } from "bun:test";
import { assignSalesAddressSchema, upsertCustomerSchema } from "./customer";

describe("sales customer address schemas", () => {
	it("allows sales-linked customer and address saves without address line 1", () => {
		expect(
			upsertCustomerSchema.safeParse({
				businessName: "Ada Homes",
				customerType: "Business",
				profileId: "1",
				salesType: "order",
				shippingSameAsBilling: false,
			}).success,
		).toBe(true);
		expect(
			assignSalesAddressSchema.safeParse({
				addressType: "billing",
				customerId: 1,
				salesId: 2,
				city: "Austin",
			}).success,
		).toBe(true);
	});
});
