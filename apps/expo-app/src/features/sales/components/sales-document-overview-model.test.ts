import { describe, expect, it } from "bun:test";
import {
	buildSalesDocumentOverviewItems,
	getSalesDocumentOverviewAmounts,
	getSalesDocumentOverviewCopy,
	getSalesDocumentOverviewFinancialDetails,
	getSalesDocumentOverviewPrimaryAction,
	sumSalesOverviewCostLines,
} from "./sales-document-overview-model";

describe("mobile sales document overview model", () => {
	it("uses quote-specific labels and explicit edit action", () => {
		const sale = {
			orderId: "03214LM",
			slug: "quote-03214lm",
			invoice: { total: 100, paid: 0, pending: 100 },
		};

		expect(
			getSalesDocumentOverviewCopy("quote", sale, "03214LM"),
		).toMatchObject({
			title: "Quote #03214LM",
			subtitle: "Quote overview",
			totalLabel: "Quote Total",
			financialTotalLabel: "Quote Total",
			openAmountLabel: "Open",
			emptyActivitiesLabel: "No recent activities for this quote.",
			emptyDeliveriesLabel: "No deliveries scheduled.",
			showOrderLogistics: false,
		});
		expect(getSalesDocumentOverviewPrimaryAction("quote", sale)).toEqual({
			label: "Edit Quote",
			kind: "edit-quote",
			slug: "quote-03214lm",
		});
	});

	it("uses order-specific logistics and create delivery action", () => {
		const sale = {
			id: 12,
			orderId: "08677DB",
			deliveryStatus: "pending",
			invoice: { total: 250, paid: 50, pending: 200 },
		};

		expect(
			getSalesDocumentOverviewCopy("order", sale, "08677DB"),
		).toMatchObject({
			title: "Order #08677DB",
			subtitle: "Sales order overview",
			totalLabel: "Total",
			financialTotalLabel: "Subtotal",
			openAmountLabel: "Due",
			emptyActivitiesLabel: "No recent activities for this order.",
			emptyDeliveriesLabel: "No deliveries scheduled.",
			showOrderLogistics: true,
		});
		expect(getSalesDocumentOverviewPrimaryAction("order", sale)).toEqual({
			label: "Create Delivery",
			kind: "create-delivery",
		});
	});

	it("prefers dispatch items and falls back to overview items", () => {
		expect(
			buildSalesDocumentOverviewItems({
				sale: {
					overviewItems: [{ id: 1, title: "Quote door", qty: 2 }],
				},
			}),
		).toEqual([
			{
				key: "1",
				title: "Quote door",
				subtitle: "No subtitle",
				quantity: 2,
			},
		]);

		expect(
			buildSalesDocumentOverviewItems({
				sale: {
					overviewItems: [{ id: 1, title: "Quote door", qty: 2 }],
				},
				dispatch: {
					dispatchables: [
						{
							uid: "door-1",
							title: "Dispatch door",
							subtitle: "Garage | 2-8",
							totalQty: { qty: 4 },
						},
					],
				},
			}),
		).toEqual([
			{
				key: "door-1",
				title: "Dispatch door",
				subtitle: "Garage | 2-8",
				quantity: 4,
				image: undefined,
			},
		]);
	});

	it("calculates financial amounts and filtered cost lines", () => {
		const sale = {
			invoice: { total: 200, paid: 50, pending: 150 },
			costLines: [
				{ label: "Sub total", amount: 180 },
				{ label: "Tax", amount: 20 },
				{ label: "Discount", amount: -5 },
			],
		};

		expect(getSalesDocumentOverviewAmounts(sale)).toEqual({
			due: 150,
			displayDue: 150,
			displayPaid: 50,
			displayTotal: 200,
			paid: 50,
			paidPct: 25,
			principalDue: 150,
			principalPaid: 50,
			principalTotal: 200,
			total: 200,
		});
		expect(sumSalesOverviewCostLines(sale, "tax")).toBe(20);
		expect(sumSalesOverviewCostLines(sale, "discount")).toBe(-5);
	});

	it("prefers card-adjusted overview display amounts from API fields and cost lines", () => {
		expect(
			getSalesDocumentOverviewAmounts({
				invoice: {
					total: 1000,
					paid: 0,
					pending: 1000,
					displayTotal: 1035,
					displayPending: 1035,
				},
			}),
		).toMatchObject({
			due: 1035,
			paid: 0,
			paidPct: 0,
			principalDue: 1000,
			principalTotal: 1000,
			total: 1035,
		});

		expect(
			getSalesDocumentOverviewAmounts({
				invoice: {
					total: 1000,
					paid: 0,
					pending: 1000,
				},
				costLines: [
					{ label: "Order Due Amount", amount: 1000 },
					{ label: "C.C.C", amount: 35 },
					{ label: "Total Due With C.C.C", amount: 1035 },
				],
			}),
		).toMatchObject({
			due: 1035,
			principalDue: 1000,
			total: 1000,
		});
	});

	it("builds website-equivalent financial details for unpaid credit-card orders", () => {
		const details = getSalesDocumentOverviewFinancialDetails({
			paymentMethod: "Credit Card",
			invoice: {
				total: 1000,
				paid: 0,
				pending: 1000,
				displayPending: 1035,
				displayTotal: 1035,
			},
			costLines: [
				{ label: "Order Due Amount", amount: 1000 },
				{ label: "C.C.C", amount: 35 },
				{ label: "Total Due With C.C.C", amount: 1035 },
			],
		});

		expect(details.paymentMethod).toBe("Credit Card");
		expect(details.progressStats).toEqual([
			{
				key: "order-total",
				label: "Order Total",
				tone: "neutral",
				value: 1000,
			},
			{
				key: "paid-order",
				label: "Paid (Order)",
				tone: "positive",
				value: 0,
			},
			{
				key: "pending-order",
				label: "Pending (Order)",
				tone: "warning",
				value: 1000,
			},
			{
				key: "card-pending",
				label: "Card Pending",
				tone: "warning",
				value: 1035,
			},
		]);
		expect(details.ledgerRows.map((row) => row.label)).toEqual([
			"Order Due Amount",
			"C.C.C",
			"Total Due With C.C.C",
		]);
		expect(details.ledgerRows.at(-1)).toMatchObject({
			bold: true,
			tone: "warning",
			value: 1035,
		});
	});

	it("surfaces recorded card paid stats without changing principal progress", () => {
		const details = getSalesDocumentOverviewFinancialDetails({
			paymentMethod: "Credit Card",
			invoice: {
				total: 850,
				paid: 850,
				pending: 0,
				displayPaid: 879.75,
				displayTotal: 879.75,
			},
			costLines: [
				{ label: "Order Total", amount: 850 },
				{ label: "Paid", amount: 850 },
				{ label: "Charged to Card", amount: 879.75 },
				{ label: "Balance Due", amount: 0 },
			],
		});

		expect(details.progressStats).toEqual([
			{
				key: "order-total",
				label: "Order Total",
				tone: "neutral",
				value: 850,
			},
			{
				key: "paid-order",
				label: "Paid (Order)",
				tone: "positive",
				value: 850,
			},
			{
				key: "card-paid",
				label: "Card Paid",
				tone: "positive",
				value: 879.75,
			},
			{
				key: "pending-order",
				label: "Pending (Order)",
				tone: "positive",
				value: 0,
			},
		]);
		expect(details.ledgerRows[2]).toMatchObject({
			label: "Charged to Card",
			tone: "positive",
			value: 879.75,
		});
	});

	it("keeps quote financial details ledger-only like the website finance tab", () => {
		const details = getSalesDocumentOverviewFinancialDetails(
			{
				paymentMethod: "Cash",
				invoice: { total: 450, paid: 0, pending: 450 },
				costLines: [{ label: "Quote Total", amount: 450 }],
			},
			"quote",
		);

		expect(details.progressStats).toEqual([]);
		expect(details.ledgerRows).toEqual([
			{
				key: "Quote Total-450-0",
				label: "Quote Total",
				value: 450,
				tone: "neutral",
				bold: true,
			},
		]);
	});
});
