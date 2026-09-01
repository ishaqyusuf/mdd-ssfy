import { describe, expect, it } from "bun:test";

import { resolvePersistedHydratedSalesSummary } from "./new-sales-form";

describe("persisted new-sales-form summary hydration", () => {
	it("preserves independent stored header totals and the matching tax authority", () => {
		const computed = {
			subTotal: 4516.73,
			adjustedSubTotal: 4516.73,
			taxRate: 7,
			taxableSubTotal: 4516.73,
			taxTotal: 316.17,
			grandTotal: 4832.9,
			totalWithCcc: 4977.89,
			discount: 0,
			discountPct: 0,
			percentDiscountValue: 0,
			labor: 0,
			delivery: 0,
			otherCosts: 0,
			ccc: 144.99,
		};

		expect(
			resolvePersistedHydratedSalesSummary(computed, {
				subTotal: 4516.72,
				tax: 313.26,
				grandTotal: 4788.38,
				taxes: [
					{ taxxable: 3425.86, tax: 239.81 },
					{ taxxable: 4475.12, tax: 313.26 },
				],
			}),
		).toMatchObject({
			subTotal: 4516.72,
			taxableSubTotal: 4475.12,
			taxTotal: 313.26,
			grandTotal: 4788.38,
		});
	});

	it("uses the complete relational graph when stored headers contradict its totals", () => {
		const computed = {
			subTotal: 890,
			adjustedSubTotal: 890,
			taxableSubTotal: 890,
			taxTotal: 0,
			grandTotal: 890,
		};

		expect(
			resolvePersistedHydratedSalesSummary(computed, {
				subTotal: 535,
				tax: 0,
				grandTotal: 535,
				items: [{ total: 175 }, { total: 175 }, { total: 540 }],
			}),
		).toEqual(computed);
	});

	it("uses the canonical collapsed lines when raw compatibility rows match stale headers", () => {
		const computed = {
			subTotal: 2385.27,
			adjustedSubTotal: 2470.27,
			taxableSubTotal: 2470.27,
			taxTotal: 172.92,
			grandTotal: 2643.19,
		};

		expect(
			resolvePersistedHydratedSalesSummary(computed, {
				subTotal: 2776.35,
				tax: 200.29,
				grandTotal: 3061.64,
				items: [
					{ total: 1439.67 },
					{ total: 401.22 },
					{ total: 182.1 },
					{ total: 206.67 },
					{ total: 546.69 },
				],
			}),
		).toEqual(computed);
	});
});
