import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolveCustomerFormSelection } from "./customer-form-selection";

describe("customer form selection reconciliation", () => {
	it("refreshes the current customer without replacing sale pricing or addresses", () => {
		expect(
			resolveCustomerFormSelection({
				current: {
					billingAddressId: 201,
					customerId: 42,
					customerProfileId: 1,
					paymentTerm: "Net 15",
					shippingAddressId: 909,
					taxCode: "FL-6",
				},
				editedCustomerId: 42,
				savedCustomer: {
					addressId: 201,
					customerId: 42,
					netTerm: "Net 30",
					profileId: 3,
					taxCode: "FL-7",
				},
			}),
		).toEqual({
			billingAddressId: 201,
			customerId: 42,
			customerProfileId: 1,
			paymentTerm: "Net 15",
			shippingAddressId: 909,
			taxCode: "FL-6",
		});
	});

	it("uses the saved primary address for a newly created customer", () => {
		expect(
			resolveCustomerFormSelection({
				current: {
					billingAddressId: null,
					customerId: null,
					customerProfileId: null,
					paymentTerm: null,
					shippingAddressId: null,
					taxCode: null,
				},
				editedCustomerId: null,
				savedCustomer: {
					addressId: 302,
					customerId: 84,
					netTerm: null,
					profileId: 5,
					taxCode: null,
				},
			}),
		).toEqual({
			billingAddressId: 302,
			customerId: 84,
			customerProfileId: 5,
			paymentTerm: null,
			shippingAddressId: 302,
			taxCode: null,
		});
	});

	it("adopts a new primary address when the current sale has no addresses", () => {
		expect(
			resolveCustomerFormSelection({
				current: {
					billingAddressId: null,
					customerId: 42,
					customerProfileId: 1,
					paymentTerm: "None",
					shippingAddressId: null,
					taxCode: null,
				},
				editedCustomerId: 42,
				savedCustomer: {
					addressId: 405,
					customerId: 42,
					netTerm: "None",
					profileId: 1,
					taxCode: null,
				},
			}),
		).toEqual({
			billingAddressId: 405,
			customerId: 42,
			customerProfileId: 1,
			paymentTerm: "None",
			shippingAddressId: 405,
			taxCode: null,
		});
	});

	it("preserves current addresses when an edit response omits an address", () => {
		expect(
			resolveCustomerFormSelection({
				current: {
					billingAddressId: 201,
					customerId: 42,
					customerProfileId: 1,
					paymentTerm: "Net 15",
					shippingAddressId: 201,
					taxCode: "FL-6",
				},
				editedCustomerId: 42,
				savedCustomer: {
					customerId: 42,
					netTerm: "Net 30",
					profileId: 3,
					taxCode: "FL-7",
				},
			}),
		).toEqual({
			billingAddressId: 201,
			customerId: 42,
			customerProfileId: 1,
			paymentTerm: "Net 15",
			shippingAddressId: 201,
			taxCode: "FL-6",
		});
	});

	it("wires the permitted edit action to the existing customer sheet", () => {
		const panelSource = readFileSync(
			new URL("./invoice-overview-panel.tsx", import.meta.url),
			"utf8",
		);
		const formSource = readFileSync(
			new URL("../new-sales-form.tsx", import.meta.url),
			"utf8",
		);
		const permissionsSource = readFileSync(
			new URL("../adapters/use-sales-form-permissions.ts", import.meta.url),
			"utf8",
		);

		expect(panelSource.includes("onEditCustomer=")).toBe(true);
		expect(panelSource.includes("customerForm: true")).toBe(true);
		expect(panelSource.includes("customerId,")).toBe(true);
		expect(formSource.includes("salesFormPermissions.canEditCustomer")).toBe(
			true,
		);
		expect(formSource.includes("dealerProfileCard")).toBe(true);
		expect(permissionsSource.includes("editSalesCustomers")).toBe(true);
	});
});
