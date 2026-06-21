import { describe, expect, it } from "bun:test";
import {
	buildSalesDocumentListQueryInput,
	getQuoteEditRoute,
	getQuoteInvoiceStatus,
} from "./sales-document-list";

describe("mobile sales document list helpers", () => {
	it("normalizes order list query input without changing the sales type", () => {
		expect(
			buildSalesDocumentListQueryInput({
				type: "order",
				q: "  08499 ",
				filters: {
					po: "PO-1",
					phone: "",
					item: null,
				},
			}),
		).toEqual({
			showing: "all sales",
			size: 50,
			q: "08499",
			po: "PO-1",
		});
	});

	it("normalizes quote list query input for the quotes endpoint", () => {
		expect(
			buildSalesDocumentListQueryInput({
				type: "quote",
				q: "  estimate ",
				filters: {
					"sales.rep": "Pablo",
					item: undefined,
				},
			}),
		).toEqual({
			showing: "all sales",
			size: 50,
			q: "estimate",
			salesType: "quote",
			"sales.rep": "Pablo",
		});
	});

	it("builds quote edit routes only when a quote has a slug", () => {
		expect(getQuoteEditRoute({ slug: " quote-03214lm " })).toEqual({
			pathname: "/(sales)/invoices/[slug]",
			params: {
				slug: "quote-03214lm",
				type: "quote",
			},
		});
		expect(getQuoteEditRoute({ slug: "" })).toBeNull();
		expect(getQuoteEditRoute({})).toBeNull();
	});

	it("labels quote invoice status from pending and total amounts", () => {
		expect(getQuoteInvoiceStatus({ invoice: { total: 100, pending: 0 } })).toBe(
			"Paid",
		);
		expect(
			getQuoteInvoiceStatus({ invoice: { total: 100, pending: 100 } }),
		).toBe("Open");
		expect(
			getQuoteInvoiceStatus({ invoice: { total: 100, pending: 25 } }),
		).toBe("Part paid");
	});
});
