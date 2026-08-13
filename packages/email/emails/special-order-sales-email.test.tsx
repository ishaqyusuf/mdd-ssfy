import { describe, expect, it } from "bun:test";
import { render } from "../render";
import ComposedSalesDocumentEmail from "./composed-sales-document-email";
import SalesEmail from "./sales-email";

const sales = [
	{
		orderId: "S-42",
		date: new Date("2026-08-13T12:00:00.000Z"),
		total: 250,
		due: 250,
	},
];

const visibleHtml = (html: string) => html.replaceAll("<!-- -->", "");

describe("Special Order actions in Sales emails", () => {
	it("renders the revision-bound action when the server supplies a pending request", async () => {
		const html = await render(
			<SalesEmail
				customerName="Customer"
				sales={sales}
				specialOrderApprovals={[
					{
						orderId: "S-42",
						approvalUrl:
							"https://example.com/sales/special-order-approval/token-42",
						expiresAt: new Date("2026-08-20T12:00:00.000Z"),
					},
				]}
			/>,
		);
		expect(visibleHtml(html)).toContain("Special Order · #S-42");
		expect(html).toContain("Review &amp; Approve Special Order");
		expect(html).toContain("token-42");
	});

	it("suppresses approval content when current server state resolves no actions", async () => {
		const html = await render(
			<SalesEmail
				customerName="Customer"
				sales={sales}
				specialOrderApprovals={[]}
			/>,
		);
		expect(html).not.toContain("Review &amp; Approve Special Order");
	});

	it("renders one independent action for each pending order in a composed email", async () => {
		const html = await render(
			<ComposedSalesDocumentEmail
				customerName="Customer"
				sales={[
					...sales,
					{
						orderId: "S-43",
						date: new Date("2026-08-13T12:00:00.000Z"),
						total: 100,
						due: 100,
					},
				]}
				subject="Order documents"
				specialOrderApprovals={[
					{
						orderId: "S-42",
						approvalUrl: "https://example.com/approval/token-42",
						expiresAt: new Date("2026-08-20T12:00:00.000Z"),
					},
					{
						orderId: "S-43",
						approvalUrl: "https://example.com/approval/token-43",
						expiresAt: new Date("2026-08-20T12:00:00.000Z"),
					},
				]}
			/>,
		);
		expect(visibleHtml(html)).toContain("Special Order · #S-42");
		expect(visibleHtml(html)).toContain("Special Order · #S-43");
		expect(html.match(/Review &amp; Approve Special Order/g)).toHaveLength(2);
	});
});
