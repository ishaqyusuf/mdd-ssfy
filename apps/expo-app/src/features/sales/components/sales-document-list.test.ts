import { describe, expect, it } from "bun:test";
import {
	adaptSalesOrderListItem,
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

	it("adapts an unpaid card order from the flat orders API row", () => {
		expect(
			adaptSalesOrderListItem({
				id: 1,
				orderId: "08499PC",
				displayName: "Acme Builders",
				customerPhone: "555-0100",
				fulfillmentLabel: "Pending",
				deliveryOption: "pickup",
				salesDate: "2 hours ago",
				baseInvoiceTotal: 1000,
				invoiceTotal: 1035,
				amountPaid: 0,
				amountDue: 1000,
				displayAmountPaid: 0,
				displayAmountDue: 1035,
				displayCcc: 35,
			}),
		).toEqual({
			id: 1,
			orderId: "08499PC",
			slug: undefined,
			displayName: "Acme Builders",
			customerPhone: "555-0100",
			deliveryStatus: "Pending",
			deliveryOption: "pickup",
			salesDate: "2 hours ago",
			invoice: {
				total: 1000,
				paid: 0,
				pending: 1000,
				baseTotal: 1000,
				displayCcc: 35,
				displayPaid: 0,
				displayPending: 1035,
				displayTotal: 1035,
			},
		});
	});

	it("adapts a partially paid order while keeping principal progress amounts", () => {
		const item = adaptSalesOrderListItem({
			baseInvoiceTotal: 1000,
			invoiceTotal: 1035,
			amountPaid: 250,
			amountDue: 750,
			displayAmountPaid: 258.75,
			displayAmountDue: 776.25,
		});

		expect(item.invoice?.paid).toBe(250);
		expect(item.invoice?.pending).toBe(750);
		expect(item.invoice?.displayPaid).toBe(258.75);
		expect(item.invoice?.displayPending).toBe(776.25);
		expect(item.invoice?.displayTotal).toBe(1035);
	});

	it("adapts a fully paid order with zero display due", () => {
		const item = adaptSalesOrderListItem({
			baseInvoiceTotal: 1000,
			invoiceTotal: 1035,
			amountPaid: 1000,
			amountDue: 0,
			displayAmountPaid: 1035,
			displayAmountDue: 0,
		});

		expect(item.invoice?.paid).toBe(1000);
		expect(item.invoice?.pending).toBe(0);
		expect(item.invoice?.displayPaid).toBe(1035);
		expect(item.invoice?.displayPending).toBe(0);
	});

	it("falls back to customerName and statusLabel when display fields are missing", () => {
		const item = adaptSalesOrderListItem({
			customerName: "Walk-in Customer",
			statusLabel: "Queued",
		});

		expect(item.displayName).toBe("Walk-in Customer");
		expect(item.deliveryStatus).toBe("Queued");
	});
});
