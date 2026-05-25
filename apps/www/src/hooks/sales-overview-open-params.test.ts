import { describe, expect, it } from "bun:test";
import {
	composeLegacyQuoteOverviewOpenParams,
	composeLegacySalesOverviewOpenParams,
	composeV2QuoteOverviewPageParams,
	composeV2QuoteOverviewSheetParams,
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

	it("maps a V2 quote id to sheet and page overview query state", () => {
		expect(composeV2QuoteOverviewSheetParams("quote-00001al")).toEqual({
			overviewSheetId: "quote-00001al",
			overviewSheetType: "quote",
			overviewSheetMode: "quote",
		});
		expect(composeV2QuoteOverviewPageParams("quote-00001al")).toEqual({
			overviewId: "quote-00001al",
			overviewType: "quote",
			overviewMode: "quote",
		});
	});
});
