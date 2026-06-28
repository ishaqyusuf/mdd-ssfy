import { describe, expect, it } from "bun:test";
import {
	buildSalesDocumentListQueryInput,
	getOrderOverviewRoute,
	getQuoteEditRoute,
	getQuoteInvoiceStatus,
	getQuoteOverviewRoute,
} from "./sales-document-list";
import {
	getInvoiceListCardState,
	getInvoiceListLedgerLabels,
	shouldShowInvoiceListProgressFooter,
} from "./sales-invoice-list-card-utils";

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

	it("builds quote overview routes from quote numbers without requiring a slug", () => {
		expect(getQuoteOverviewRoute({ orderId: " 03214LM " })).toEqual({
			pathname: "/(sales)/quotes/[quoteNo]",
			params: {
				quoteNo: "03214LM",
			},
		});
		expect(getQuoteOverviewRoute({ orderId: "" })).toBeNull();
		expect(getQuoteOverviewRoute({})).toBeNull();
	});

	it("keeps order overview routes pointed at the existing order detail screen", () => {
		expect(getOrderOverviewRoute({ orderId: " 08499PC " })).toEqual({
			pathname: "/(sales)/orders/[orderNo]",
			params: {
				orderNo: "08499PC",
			},
		});
		expect(getOrderOverviewRoute({ orderId: "" })).toBeNull();
		expect(getOrderOverviewRoute({})).toBeNull();
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

	it("uses quote-specific list ledger labels without remaining due copy", () => {
		expect(getInvoiceListLedgerLabels("quote", 25)).toEqual({
			total: "Quote Total",
			due: null,
		});
		expect(shouldShowInvoiceListProgressFooter("quote")).toBe(false);
	});

	it("preserves order list ledger labels and progress footer", () => {
		expect(getInvoiceListLedgerLabels("order", 25)).toEqual({
			total: "Total Amount",
			due: "Remaining Due",
		});
		expect(getInvoiceListLedgerLabels("order", 0)).toEqual({
			total: "Total Amount",
			due: "Balance",
		});
		expect(shouldShowInvoiceListProgressFooter("order")).toBe(true);
	});

	it("uses card-adjusted display amounts while keeping principal progress", () => {
		expect(
			getInvoiceListCardState("order", {
				orderId: "08499PC",
				deliveryStatus: "pending",
				invoice: {
					total: 1000,
					paid: 250,
					pending: 750,
					displayTotal: 1035,
					displayPending: 776.25,
				},
			}),
		).toMatchObject({
			due: 776.25,
			paid: 250,
			paidPct: 25,
			total: 1035,
		});
	});
});
