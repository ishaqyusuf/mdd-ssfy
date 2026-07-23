import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("customer mutation permission boundary", () => {
	it("requires customer-edit permission for customer and address writes", () => {
		const source = readFileSync(
			new URL("./customer.route.ts", import.meta.url),
			"utf8",
		);

		expect(source.includes('"editSalesCustomers"')).toBe(true);
		expect(
			source.match(/await requireCustomerEditor\(props\.ctx\);/g)?.length,
		).toBe(2);
	});
});
