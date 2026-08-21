import { describe, expect, test } from "bun:test";
import type { SalesOverviewData } from "./types";
import { createGeneralTabV2ViewModel } from "./view-model";

function overview(overrides: Partial<SalesOverviewData> = {}) {
	return {
		id: 42,
		type: "order",
		invoice: {
			baseTotal: 1000,
			displayCcc: 0,
			displayPaid: 400,
			displayPending: 600,
			displayTotal: 1000,
			total: 1000,
			paid: 400,
			pending: 600,
		},
		financialBreakdown: {
			documentType: "order",
			invoice: {
				subtotalCents: 90_000,
				adjustments: [],
				taxes: [],
				totalCents: 100_000,
				paidCents: 40_000,
				refundedCents: 0,
				balanceCents: 60_000,
			},
			paymentGroups: [
				{
					method: "card",
					label: "Card",
					paymentCount: 1,
					principalCents: 40_000,
					cccCents: 3_000,
					tipCents: 0,
					customerChargedCents: 43_000,
					cccEvidence: "recorded",
				},
			],
			pendingCardEstimate: null,
		},
		costLines: [
			{ label: "Subtotal", amount: 900 },
			{ label: "C.C.C", amount: 30 },
			{ label: "Total Due With C.C.C", amount: 630 },
		],
		paymentMethod: "credit-card",
		stats: {
			prodCompleted: { percentage: 50 },
			dispatchCompleted: { percentage: 25 },
		},
		status: {
			production: { status: "in-progress" },
			delivery: { status: "packing-queue" },
		},
		...overrides,
	} as SalesOverviewData;
}

describe("General V2 view model", () => {
	test("separates invoice and card settlement lines without duplicating totals", () => {
		const view = createGeneralTabV2ViewModel(overview());

		expect(view.invoiceLines.map((line) => line.label)).toEqual([
			"Subtotal",
			"Total",
			"Paid",
			"Card Payment",
		]);
		expect(view.cardLines.map((line) => line.label)).toEqual([
			"C.C.C.",
			"Total charged",
		]);
		expect(view.payableDueCents).toBe(60_000);
		expect(view.paymentPercentage).toBe(40);
		expect(view.paymentStatus).toBe("Payment due");
	});

	test("normalizes operational states and clamps percentages", () => {
		const view = createGeneralTabV2ViewModel(
			overview({
				stats: {
					prodCompleted: { percentage: 130 },
					dispatchCompleted: { percentage: -10 },
				},
			}),
		);

		expect(view.production).toEqual({
			status: "In Progress",
			percentage: 100,
		});
		expect(view.fulfillment).toEqual({
			status: "Packing Queue",
			percentage: 0,
		});
	});

	test("treats a fully paid invoice as settled", () => {
		const view = createGeneralTabV2ViewModel(
			overview({
				invoice: {
					baseTotal: 1000,
					displayCcc: 0,
					displayPaid: 1000,
					displayPending: 0,
					displayTotal: 1000,
					total: 1000,
					paid: 1000,
					pending: 0,
				},
				costLines: [{ label: "Subtotal", amount: 1000 }],
				financialBreakdown: {
					documentType: "order",
					invoice: {
						subtotalCents: 100_000,
						adjustments: [],
						taxes: [],
						totalCents: 100_000,
						paidCents: 100_000,
						refundedCents: 0,
						balanceCents: 0,
					},
					paymentGroups: [],
					pendingCardEstimate: null,
				},
			}),
		);

		expect(view.payableDueCents).toBe(0);
		expect(view.paymentStatus).toBe("Settled");
	});
});
