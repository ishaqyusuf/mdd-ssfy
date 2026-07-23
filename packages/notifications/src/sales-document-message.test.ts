// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import {
	buildSalesDocumentChannelMessage,
	shortenSalesDocumentMessageLinks,
} from "./sales-document-message";

describe("sales document channel messages", () => {
	test("builds compact quote copy with only available short links", () => {
		const message = buildSalesDocumentChannelMessage({
			type: "quote",
			customerName: "Ada",
			salesNos: ["Q-100"],
			links: {
				pdfLink: "https://gnd.test/sh/pdf",
				acceptQuoteLink: "https://gnd.test/sh/accept",
			},
		});

		expect(message).toContain("Hello Ada,");
		expect(message).toContain("quote Q-100");
		expect(message).toContain("Review and accept: https://gnd.test/sh/accept");
		expect(message).toContain("View document: https://gnd.test/sh/pdf");
		expect(message).not.toContain("Make a payment:");
	});

	test("reuses stable source identities for each target kind", async () => {
		const calls: Array<Record<string, unknown>> = [];
		const db = {
			shortLink: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) => {
					calls.push(where);
					return {
						slug: String(where.sourceId).endsWith(":pdf")
							? "pdf-short"
							: "payment-short",
						expiresAt: new Date(Date.now() + 60_000),
					};
				},
			},
		};

		const links = await shortenSalesDocumentMessageLinks(db as never, {
			type: "order",
			salesIds: [42],
			salesNos: ["10042"],
			pdfLink: "https://gnd.test/long-pdf",
			paymentLink: "https://gnd.test/long-payment",
			expiresAt: new Date(Date.now() + 60_000),
		});

		expect(calls.map((call) => call.sourceId)).toEqual([
			"order:42:pdf",
			"order:42:payment",
		]);
		expect(links.pdfLink).toEndWith("/sh/pdf-short");
		expect(links.paymentLink).toEndWith("/sh/payment-short");
	});

	test("keeps channel copy within the provider-safe message bound", () => {
		const message = buildSalesDocumentChannelMessage({
			type: "order",
			salesNos: ["10042"],
			message: "x".repeat(5_000),
			links: {
				pdfLink: "https://gnd.test/sh/pdf",
				paymentLink: "https://gnd.test/sh/pay",
			},
		});
		expect(message.length).toBeLessThanOrEqual(1_500);
		expect(message).toContain("https://gnd.test/sh/pdf");
		expect(message).toContain("https://gnd.test/sh/pay");
	});
});
