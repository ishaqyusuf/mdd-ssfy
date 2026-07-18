import { describe, expect, it } from "bun:test";
import {
	shouldPreserveInitialEditCustomerResolution,
	shouldPreserveInitialEditTaxRate,
} from "./customer-resolution";

describe("shouldPreserveInitialEditCustomerResolution", () => {
	it("preserves the saved profile and addresses on the first edit resolution", () => {
		expect(
			shouldPreserveInitialEditCustomerResolution({
				mode: "edit",
				initialCustomerId: 42,
				currentCustomerId: 42,
				resolvedCustomerId: 42,
				initialResolutionHandled: false,
			}),
		).toBe(true);
	});

	it("allows resolved defaults after the customer is explicitly changed", () => {
		expect(
			shouldPreserveInitialEditCustomerResolution({
				mode: "edit",
				initialCustomerId: 42,
				currentCustomerId: 84,
				resolvedCustomerId: 84,
				initialResolutionHandled: true,
			}),
		).toBe(false);
	});

	it("allows create forms to apply the resolved customer defaults", () => {
		expect(
			shouldPreserveInitialEditCustomerResolution({
				mode: "create",
				initialCustomerId: null,
				currentCustomerId: 42,
				resolvedCustomerId: 42,
				initialResolutionHandled: false,
			}),
		).toBe(false);
	});
});

describe("shouldPreserveInitialEditTaxRate", () => {
	it("preserves the authoritative saved rate while the edit tax code is unchanged", () => {
		expect(
			shouldPreserveInitialEditTaxRate({
				mode: "edit",
				initialTaxCode: "COUNTY_STATE",
				currentTaxCode: "COUNTY_STATE",
			}),
		).toBe(true);
	});

	it("allows tax resolution after an explicit code change", () => {
		expect(
			shouldPreserveInitialEditTaxRate({
				mode: "edit",
				initialTaxCode: "COUNTY_STATE",
				currentTaxCode: "EXEMPT",
			}),
		).toBe(false);
	});

	it("allows create forms to resolve their initial tax rate", () => {
		expect(
			shouldPreserveInitialEditTaxRate({
				mode: "create",
				initialTaxCode: undefined,
				currentTaxCode: "COUNTY_STATE",
			}),
		).toBe(false);
	});
});
