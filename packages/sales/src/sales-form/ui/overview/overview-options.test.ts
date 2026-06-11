import { describe, expect, it } from "bun:test";
import {
	buildSalesFormProfileSelectOptions,
	buildSalesFormTaxSelectOptions,
	getDefaultSalesFormCustomerProfile,
	normalizeSalesFormPaymentTerm,
	normalizeSalesFormTaxOptions,
	resolveSalesFormProfilePaymentTerm,
	resolveSalesFormTaxRateByCode,
} from "./overview-options";
import { hasSalesFormSummaryDrift } from "./overview-summary";

describe("sales form overview options", () => {
	it("selects tier 1 as the default customer profile", () => {
		const profile = getDefaultSalesFormCustomerProfile([
			{ id: 1, title: "Retail" },
			{ id: 2, title: "Tier 1" },
		]);

		expect(profile?.id).toBe(2);
	});

	it("builds profile and tax select options", () => {
		const taxes = normalizeSalesFormTaxOptions([
			{ taxCode: "TX", title: "Texas", percentage: "8.25" },
		]);

		expect(buildSalesFormProfileSelectOptions([{ id: 4, title: "Pro" }])).toEqual([
			{ value: "none", label: "None" },
			{ value: "4", label: "Pro" },
		]);
		expect(buildSalesFormTaxSelectOptions(taxes)).toEqual([
			{ value: "none", label: "Tax Exempt" },
			{ value: "TX", label: "Texas (8.25%)" },
		]);
		expect(resolveSalesFormTaxRateByCode(taxes, "TX")).toBe(8.25);
	});

	it("canonicalizes payment terms from customer and profile metadata", () => {
		expect(normalizeSalesFormPaymentTerm("Due on receipt")).toBe(
			"Due on Receipt",
		);
		expect(resolveSalesFormProfilePaymentTerm({ netTerm: "net 30" }, "None")).toBe(
			"Net 30",
		);
		expect(resolveSalesFormProfilePaymentTerm({}, "net 15")).toBe("Net 15");
	});
});

describe("sales form overview summary", () => {
	it("detects summary drift across displayed totals", () => {
		expect(
			hasSalesFormSummaryDrift(
				{ subTotal: 10, adjustedSubTotal: 10, taxTotal: 1, grandTotal: 11 },
				{ subTotal: 10, adjustedSubTotal: 10, taxTotal: 1, grandTotal: 11 },
			),
		).toBe(false);

		expect(
			hasSalesFormSummaryDrift(
				{ subTotal: 10, adjustedSubTotal: 10, taxTotal: 1, grandTotal: 11 },
				{ subTotal: 12, adjustedSubTotal: 12, taxTotal: 1, grandTotal: 13 },
			),
		).toBe(true);
	});
});
