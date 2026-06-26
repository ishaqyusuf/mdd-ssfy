import { describe, expect, it } from "bun:test";
import {
	buildPrintRequests,
	calculatePaymentChannelChargePreview,
	calculatePaymentPlanPreview,
	resolveDefaultPaymentMethod,
} from "./utils";

describe("sales payment processor utils", () => {
	it("uses the selected sale payment method when available", () => {
		expect(
			resolveDefaultPaymentMethod(
				[
					{ id: 1, paymentMethod: "Check" },
					{ id: 2, paymentMethod: "Credit Card" },
				],
				[2],
			),
		).toBe("credit-card");
	});

	it("uses the first selected sale payment method", () => {
		expect(
			resolveDefaultPaymentMethod(
				[
					{ id: 1, paymentMethod: "Check" },
					{ id: 2, paymentMethod: "Credit Card" },
				],
				[2, 1],
			),
		).toBe("credit-card");
	});

	it("uses another order payment method when the selected sale has none", () => {
		expect(
			resolveDefaultPaymentMethod(
				[
					{ id: 1, paymentMethod: "Check" },
					{ id: 2, paymentMethod: null },
				],
				[2],
			),
		).toBe("check");
	});

	it("uses the recent customer payment method when no order payment method exists", () => {
		expect(
			resolveDefaultPaymentMethod([{ id: 1, paymentMethod: null }], [1], {
				recentPaymentMethod: "Check",
			}),
		).toBe("check");
	});

	it("defaults to credit card when no order or recent payment method exists", () => {
		expect(
			resolveDefaultPaymentMethod([{ id: 1, paymentMethod: null }], [1]),
		).toBe("credit-card");
	});

	it("skips terminal defaults when terminal payments are disabled", () => {
		expect(
			resolveDefaultPaymentMethod(
				[
					{ id: 1, paymentMethod: "Terminal Payment" },
					{ id: 2, paymentMethod: "Cash" },
				],
				[1],
				{
					recentPaymentMethod: "Terminal Payment",
					terminalEnabled: false,
				},
			),
		).toBe("cash");
	});

	it("combines invoice and packing slip print selections into one request", () => {
		expect(
			buildPrintRequests({
				salesIds: [1],
				shouldPrintInvoice: true,
				shouldPrintPackingSlip: true,
			}),
		).toEqual([
			{
				mode: "invoice,packing-slip",
				salesIds: [1],
				windowRef: null,
			},
		]);
	});

	it("previews ccc for online/card payment channels", () => {
		expect(
			calculatePaymentChannelChargePreview({
				paymentMethod: "link",
				amount: 500,
				cccPercentage: 3.5,
			}),
		).toMatchObject({
			applies: true,
			baseAmount: 500,
			feeAmount: 17.5,
			chargeAmount: 517.5,
		});
	});

	it("does not preview ccc for cash payments", () => {
		expect(
			calculatePaymentChannelChargePreview({
				paymentMethod: "cash",
				amount: 500,
				cccPercentage: 3.5,
			}),
		).toMatchObject({
			applies: false,
			feeAmount: 0,
			chargeAmount: 500,
		});
	});

	it("previews wallet applied before external card payment", () => {
		expect(
			calculatePaymentPlanPreview({
				paymentMethod: "credit-card",
				selectedBalance: 500,
				walletBalance: 125,
				useWallet: true,
				externalAmount: 375,
				cccPercentage: 3.5,
			}),
		).toMatchObject({
			walletApplied: 125,
			remainingAfterWallet: 375,
			baseAmount: 375,
			feeAmount: 13.13,
			chargeAmount: 388.13,
			walletCreditAmount: 0,
		});
	});

	it("previews overpayment as wallet credit", () => {
		expect(
			calculatePaymentPlanPreview({
				paymentMethod: "credit-card",
				selectedBalance: 500,
				externalAmount: 600,
				cccPercentage: 3.5,
			}),
		).toMatchObject({
			baseAmount: 500,
			feeAmount: 17.5,
			chargeAmount: 617.5,
			walletCreditAmount: 100,
		});
	});

	it("previews ccc from remaining amount due after prior payments", () => {
		expect(
			calculatePaymentPlanPreview({
				paymentMethod: "Credit Card",
				selectedBalance: 250,
				externalAmount: 250,
				cccPercentage: 3.5,
			}),
		).toMatchObject({
			baseAmount: 250,
			feeAmount: 8.75,
			chargeAmount: 258.75,
			walletCreditAmount: 0,
		});
	});
});
