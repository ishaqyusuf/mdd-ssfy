import { describe, expect, it } from "bun:test";
import {
	normalizeDealerDeliveryPricingSettings,
	resolveDealerDeliveryCostSuggestion,
} from "./dealer-delivery-pricing";

describe("dealer delivery pricing", () => {
	it("suggests the configured cost for delivery and shipping", () => {
		const settings = normalizeDealerDeliveryPricingSettings({
			enabled: true,
			deliveryBaseCost: 45,
			shipBaseCost: 80,
		});

		expect(
			resolveDealerDeliveryCostSuggestion({
				settings,
				deliveryOption: "delivery",
				grandTotal: 500,
			}),
		).toMatchObject({ cost: 45, source: "sales_settings" });
		expect(
			resolveDealerDeliveryCostSuggestion({
				settings,
				deliveryOption: "ship",
				grandTotal: 500,
			}),
		).toMatchObject({ cost: 80, source: "sales_settings" });
	});

	it("suggests free delivery above the configured threshold", () => {
		const settings = normalizeDealerDeliveryPricingSettings({
			enabled: true,
			deliveryBaseCost: 45,
			shipBaseCost: 80,
			freeDeliveryOrderMinimum: 1_000,
		});

		expect(
			resolveDealerDeliveryCostSuggestion({
				settings,
				deliveryOption: "delivery",
				grandTotal: 1_200,
			}),
		).toMatchObject({ cost: 0 });
		expect(
			resolveDealerDeliveryCostSuggestion({
				settings,
				deliveryOption: "ship",
				grandTotal: 1_200,
			}),
		).toMatchObject({ cost: 80 });
	});

	it("returns no suggestion when automation is disabled", () => {
		const settings = normalizeDealerDeliveryPricingSettings({});
		expect(
			resolveDealerDeliveryCostSuggestion({
				settings,
				deliveryOption: "delivery",
			}),
		).toBeNull();
	});
});
