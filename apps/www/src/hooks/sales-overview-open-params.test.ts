import { describe, expect, it } from "bun:test";
import {
	buildSalesOverviewUrl,
	composeLegacyQuoteOverviewOpenParams,
	composeLegacySalesOverviewOpenParams,
} from "./sales-overview-open-params";

describe("sales overview open params", () => {
	it("maps a legacy quote row uuid to the quote overview query state", () => {
		expect(composeLegacyQuoteOverviewOpenParams("quote-uuid-1")).toEqual({
			"sales-overview-id": "quote-uuid-1",
			"sales-type": "quote",
			mode: "quote",
			salesTab: "general",
		});
	});

	it("keeps assigned production users on the production view for legacy opens", () => {
		expect(
			composeLegacySalesOverviewOpenParams("order-uuid-1", "sales", {
				assignedTo: 77,
			}),
		).toEqual({
			"sales-overview-id": "order-uuid-1",
			"sales-type": "order",
			mode: "production-tasks",
			salesTab: "production",
		});
	});

	it("preserves the requested canonical tab and dispatch context", () => {
		expect(
			composeLegacySalesOverviewOpenParams("order-1", "dispatch-modal", {
				dispatchId: "42",
				salesTab: "packing",
			}),
		).toEqual({
			"sales-overview-id": "order-1",
			"sales-type": "order",
			mode: "dispatch-modal",
			salesTab: "packing",
			dispatchId: 42,
		});
	});

	it("builds one canonical orders workspace URL", () => {
		expect(
			buildSalesOverviewUrl("order 1", "sales-production", {
				salesTab: "production",
			}),
		).toBe(
			"/sales-book/orders?sales-overview-id=order+1&sales-type=order&mode=sales-production&salesTab=production",
		);
	});
});
