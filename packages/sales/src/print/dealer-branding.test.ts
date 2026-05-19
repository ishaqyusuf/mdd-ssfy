// @ts-expect-error packages/sales typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import {
	getDealerLogoUrl,
	resolveDealerPrintBrandingFromSource,
} from "./dealer-branding";

describe("dealer print branding", () => {
	it("resolves dealer logo and company address", () => {
		const branding = resolveDealerPrintBrandingFromSource({
			companyName: "Dealer Co",
			name: "Fallback Dealer",
			phoneNo: "555-2222",
			meta: {
				logoUrl: "https://cdn.example.com/dealer-logo.png",
			},
			primaryBillingAddress: {
				address1: "123 Dealer St",
				address2: "Suite 4",
				city: "Lagos",
				state: "LA",
				country: "NG",
			},
		});

		expect(branding?.logoUrl).toBe("https://cdn.example.com/dealer-logo.png");
		expect(branding?.companyAddress).toEqual({
			address1: "Dealer Co",
			address2: "123 Dealer St Suite 4 Lagos, LA, NG",
			phone: "555-2222",
		});
	});

	it("ignores empty logo values", () => {
		expect(getDealerLogoUrl({ logoUrl: "   " })).toBeUndefined();
		expect(getDealerLogoUrl(null)).toBeUndefined();
	});
});
