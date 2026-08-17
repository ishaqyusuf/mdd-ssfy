import { describe, expect, it } from "bun:test";

import {
	buildCustomerMatchQuery,
	findBlockingCustomerMatches,
	getCustomerMatchSignals,
} from "./customer-match";

describe("customer create matching", () => {
	it("prioritizes phone, then email, then the visible customer name", () => {
		expect(
			buildCustomerMatchQuery({
				customerType: "Business",
				name: "Ada Lovelace",
				businessName: "Analytical Doors",
				email: "ada@example.com",
				phoneNo: "555-123-4567",
			}),
		).toBe("555-123-4567");
		expect(
			buildCustomerMatchQuery({
				customerType: "Business",
				businessName: "Analytical Doors",
				email: "ada@example.com",
			}),
		).toBe("ada@example.com");
		expect(
			buildCustomerMatchQuery({
				customerType: "Business",
				businessName: "Analytical Doors",
			}),
		).toBe("Analytical Doors");
	});

	it("does not search on inputs that are too short to be useful", () => {
		expect(buildCustomerMatchQuery({ name: "Al", phoneNo: "555" })).toBeNull();
	});

	it("identifies matching details without blocking ordinary same-name records", () => {
		const input = {
			name: "Ada Lovelace",
			email: "ADA@EXAMPLE.COM",
			phoneNo: "(555) 123-4567",
		};
		const sameCustomer = {
			id: 10,
			name: "ada lovelace",
			email: "ada@example.com",
			phoneNo: "555-123-4567",
		};
		const sameNameOnly = {
			id: 11,
			name: "Ada Lovelace",
			phoneNo: "555-000-0000",
		};

		expect(getCustomerMatchSignals(input, sameCustomer)).toEqual([
			"phone",
			"email",
			"name",
		]);
		expect(findBlockingCustomerMatches(input, [sameCustomer, sameNameOnly])).toEqual([
			sameCustomer,
		]);
	});
});
