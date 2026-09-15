import { describe, expect, it } from "bun:test";
import { buildSalesPrintContinuationRequest } from "./sales-print-continuation";

describe("sales print continuation", () => {
	it("preserves totals-only pricing for reprint and regeneration requests", () => {
		expect(
			buildSalesPrintContinuationRequest({
				salesIds: [42, 43],
				mode: "quote",
				pricingMode: "customer",
				priceDisplay: "totals-only",
				dispatchId: null,
				templateId: "template-2",
				pageBreakMode: "section",
				printConfig: { showImages: false },
				baseUrl: "https://example.com",
			}),
		).toEqual({
			salesIds: [42, 43],
			mode: "quote",
			pricingMode: "customer",
			priceDisplay: "totals-only",
			dispatchId: null,
			templateId: "template-2",
			pageBreakMode: "section",
			printConfig: { showImages: false },
			baseUrl: "https://example.com",
		});
	});
});
