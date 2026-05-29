// @ts-expect-error apps/dealership typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import { dealerPricingTerms } from "./dealer-pricing-terms";

describe("dealer pricing terms", () => {
  it("uses dealer-relative cost and sales price language", () => {
    expect(dealerPricingTerms.costView).toBe("Cost");
    expect(dealerPricingTerms.salesPriceView).toBe("Sales Price");
    expect(dealerPricingTerms.salesPriceMarkup).toBe("Sales Price Markup");
    expect(dealerPricingTerms.showProfit).toBe("Show Profit");
  });
});

