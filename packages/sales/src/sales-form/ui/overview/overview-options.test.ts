import { describe, expect, it } from "bun:test";
import {
	buildSalesFormProfileSelectOptions,
	buildSalesFormTaxSelectOptions,
	getDefaultSalesFormCustomerProfile,
	normalizeSalesFormPaymentTerm,
	normalizeSalesFormTaxOptions,
	resolveSalesFormProfilePaymentTerm,
	resolveSalesFormTaxRateByCode,
	salesFormPaymentMethods,
} from "./overview-options";
import {
	hasSalesFormSummaryDrift,
	resolveSalesFormOverviewSummary,
} from "./overview-summary";

describe("sales form overview options", () => {
	it("includes Zelle in the shared sales-form payment methods", () => {
		expect(salesFormPaymentMethods).toContain("Zelle");
	});

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

		expect(
			buildSalesFormProfileSelectOptions([{ id: 4, title: "Pro" }]),
		).toEqual([
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
		expect(
			resolveSalesFormProfilePaymentTerm({ netTerm: "net 30" }, "None"),
		).toBe("Net 30");
		expect(resolveSalesFormProfilePaymentTerm({}, "net 15")).toBe("Net 15");
		expect(normalizeSalesFormPaymentTerm("Net30")).toBe("Net 30");
		expect(normalizeSalesFormPaymentTerm("NET20")).toBe("Net 20");
	});
});

describe("sales form overview summary", () => {
	it("keeps persisted financial authority until the user edits the sale", () => {
		const persisted = {
			subTotal: 4516.72,
			adjustedSubTotal: 4516.72,
			taxRate: 7,
			taxTotal: 313.26,
			grandTotal: 4788.38,
			ccc: 143.65,
			totalWithCcc: 4932.03,
		};
		const computed = {
			...persisted,
			subTotal: 4516.73,
			taxTotal: 316.17,
			grandTotal: 4832.9,
			ccc: 144.99,
			totalWithCcc: 4977.89,
		};

		expect(
			resolveSalesFormOverviewSummary({
				persisted,
				computed,
				isPersistedSale: true,
				dirty: false,
			}),
		).toEqual(persisted);
		expect(
			resolveSalesFormOverviewSummary({
				persisted,
				computed,
				isPersistedSale: true,
				dirty: true,
			}),
		).toEqual(computed);
	});

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
