// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import { render } from "../render";
import DealerSalesRequestEmail from "./dealer-sales-request";

describe("dealer sales request email", () => {
	it("renders the request details and review action", async () => {
		const html = await render(
			<DealerSalesRequestEmail
				recipientName="Pablo Cruz"
				dealerName="Acme Dealer"
				quoteNo="00042DPP"
				customerName="Jane Customer"
				requestedAt="2026-07-19T12:00:00.000Z"
				requestUrl="https://gndprodesk.com/sales-rep?tab=requests&requestId=42"
			/>,
		);

		expect(html).toContain("Dealer Order Request");
		expect(html).toContain("Acme Dealer");
		expect(html).toContain("Review Request");
		expect(html).toContain("requestId=42");
	});
});
