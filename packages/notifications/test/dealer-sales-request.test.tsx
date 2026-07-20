// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import { dealerSalesRequest } from "../src/types/dealer-sales-request";

const payload = {
	requestId: 42,
	salesId: 314,
	quoteNo: "00042DPP",
	dealerName: "Acme Dealer",
	customerName: "Jane Customer",
	requestedAt: "2026-07-19T12:00:00.000Z",
};

describe("dealer sales request notification", () => {
	it("creates the sales-rep in-app activity", () => {
		const activity = dealerSalesRequest.createActivity(
			payload,
			{ id: 7 } as never,
			{} as never,
		);

		expect(activity).toMatchObject({
			type: "dealer_sales_request",
			subject: "Dealer order request",
			authorId: 7,
			tags: {
				requestId: 42,
				salesId: 314,
				quoteNo: "00042DPP",
			},
		});
	});

	it("creates an email with a direct request-review link", () => {
		const email = dealerSalesRequest.createEmail?.(
			payload,
			{} as never,
			{
				name: "Pablo Cruz",
				email: "pablo@example.com",
			} as never,
			{},
		);

		expect(email).toMatchObject({
			template: "dealer-sales-request",
			to: ["pablo@example.com"],
			subject: "Dealer order request for quote 00042DPP",
			data: {
				recipientName: "Pablo Cruz",
				dealerName: "Acme Dealer",
				quoteNo: "00042DPP",
				customerName: "Jane Customer",
			},
		});
		expect(email?.data.requestUrl).toContain(
			"/sales-rep?tab=requests&requestId=42",
		);
	});
});
