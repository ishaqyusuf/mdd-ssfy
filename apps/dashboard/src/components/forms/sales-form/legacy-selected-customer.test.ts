import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const createOrderRoute = readFileSync(
	new URL(
		"../../../app/(clean-code)/(sales)/sales-book/(form)/create-order/page.tsx",
		import.meta.url,
	),
	"utf8",
);
const createQuoteRoute = readFileSync(
	new URL(
		"../../../app/(clean-code)/(sales)/sales-book/(form)/create-quote/page.tsx",
		import.meta.url,
	),
	"utf8",
);
const legacyCreateLoader = readFileSync(
	new URL(
		"../../../app-deps/(clean-code)/(sales)/_common/data-access/sales-form-dta.ts",
		import.meta.url,
	),
	"utf8",
);
const legacyStateInitializer = readFileSync(
	new URL(
		"../../../app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper.ts",
		import.meta.url,
	),
	"utf8",
);

describe("legacy sales form selected customer deep links", () => {
	it("normalizes and forwards selectedCustomerId on both create routes", () => {
		for (const route of [createOrderRoute, createQuoteRoute]) {
			expect(route).toContain("normalizeSalesFormInitialCustomerId");
			expect(route).toContain("searchParams.selectedCustomerId");
			expect(route).toContain("customerId:");
		}
	});

	it("hydrates only active office customers and their primary sales defaults", () => {
		expect(legacyCreateLoader).toContain("dealerOwnerId: null");
		expect(legacyCreateLoader).toContain("deletedAt: null");
		expect(legacyCreateLoader).toContain("customer: selectedCustomer");
		expect(legacyCreateLoader).toContain(
			"billingAddressId: selectedAddress?.id",
		);
		expect(legacyCreateLoader).toContain(
			"shippingAddressId: selectedAddress?.id",
		);
		expect(legacyCreateLoader).toContain("initialTaxCode: selectedTaxCode");
		expect(legacyStateInitializer).toContain(
			"data.salesProfile || data.data?.defaultProfile",
		);
	});
});
