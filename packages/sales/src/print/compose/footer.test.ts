import { describe, expect, it } from "bun:test";
import type { PrintSalesData } from "../query";
import { composeFooter } from "./footer";
import {
	getPrintPaymentFooterState,
	getPrintPaymentFooterSummary,
} from "./payment-footer-state";

function payment(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		amount: 8,
		status: "completed",
		tip: 0,
		meta: {
			paymentMethod: "card",
			salesAmount: 8,
			feeAmount: 0.28,
			customerChargeAmount: 8.28,
		},
		...overrides,
	} as PrintSalesData["payments"][number];
}

function refund(overrides: Record<string, unknown> = {}) {
	return payment({
		id: 2,
		amount: -8,
		origin: "square_refund",
		meta: { cccCents: 28 },
		...overrides,
	});
}

function createSale(overrides: Partial<PrintSalesData> = {}): PrintSalesData {
	return {
		subTotal: 100,
		tax: 0,
		grandTotal: 100,
		amountDue: 100,
		meta: {},
		payments: [],
		taxes: [],
		extraCosts: [],
		...overrides,
	} as PrintSalesData;
}

describe("composeFooter", () => {
	it("reconciles a completed card refund with the reopened principal balance", () => {
		const sale = createSale({
			grandTotal: 8,
			amountDue: 8,
			payments: [payment(), refund()],
		});
		const lines = composeFooter(sale, "invoice")!.lines;
		expect(lines).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "Order Total", value: "$8.00" }),
				expect.objectContaining({ label: "Card Payment", value: "$8.00" }),
				expect.objectContaining({ label: "Charged to Card", value: "$8.28" }),
				expect.objectContaining({
					label: "Principal Refunded",
					value: "$8.00",
				}),
				expect.objectContaining({ label: "C.C.C. Refunded", value: "$0.28" }),
				expect.objectContaining({
					label: "Net Paid Toward Order",
					value: "$0.00",
				}),
				expect.objectContaining({ label: "Balance Due", value: "$8.00" }),
			]),
		);
		expect(
			getPrintPaymentFooterSummary(getPrintPaymentFooterState(sale)),
		).toEqual({ cardFees: 0, totalPaid: 0 });
	});

	it("uses only this order's partial refund allocation, including fee and tip", () => {
		const sale = createSale({
			grandTotal: 8,
			amountDue: 3,
			payments: [
				payment({ tip: 1 }),
				refund({
					amount: -3,
					tip: -0.4,
					meta: { cccCents: 10 },
					transaction: {
						meta: { cccCents: 250, principalCents: 5000, tipCents: 600 },
					},
				}),
			],
		});
		expect(composeFooter(sale, "invoice")!.lines).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: "Net Paid Toward Order",
					value: "$5.00",
				}),
				expect.objectContaining({
					label: "Principal Refunded",
					value: "$3.00",
				}),
				expect.objectContaining({ label: "C.C.C. Refunded", value: "$0.10" }),
				expect.objectContaining({ label: "Tip Refunded", value: "$0.40" }),
				expect.objectContaining({ label: "Balance Due", value: "$3.00" }),
			]),
		);
		expect(
			getPrintPaymentFooterSummary(getPrintPaymentFooterState(sale)),
		).toEqual({ cardFees: 0.18, totalPaid: 5.18 });
	});

	it("prints a fee-only refund without reopening paid principal", () => {
		const sale = createSale({
			grandTotal: 8,
			amountDue: 0,
			payments: [payment(), refund({ amount: 0 })],
		});
		const lines = composeFooter(sale, "invoice")!.lines;
		expect(lines).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "Paid Toward Order", value: "$8.00" }),
				expect.objectContaining({ label: "C.C.C. Refunded", value: "$0.28" }),
				expect.objectContaining({ label: "Balance Due", value: "$0.00" }),
			]),
		);
		expect(lines.some((line) => line.label === "Principal Refunded")).toBe(
			false,
		);
	});

	it.each(["pending", "failed", "rejected"])(
		"does not count a %s refund as posted",
		(status) => {
			const sale = createSale({
				grandTotal: 8,
				amountDue: 0,
				payments: [
					payment(),
					refund({ status }),
					refund({ id: 3, deletedAt: new Date() }),
				],
			});
			const lines = composeFooter(sale, "invoice")!.lines;
			expect(lines).toContainEqual(
				expect.objectContaining({ label: "Paid Toward Order", value: "$8.00" }),
			);
			expect(lines.some((line) => line.label.includes("Refunded"))).toBe(false);
		},
	);

	it("keeps GND refunds out of the dealer's customer invoice", () => {
		const sale = createSale({
			grandTotal: 10,
			amountDue: 10,
			payments: [payment(), refund()],
			dealerCustomerPayment: { paidAmount: 0 },
		} as Partial<PrintSalesData>);
		const lines = composeFooter(sale, "invoice")!.lines;
		expect(lines).toContainEqual(
			expect.objectContaining({ label: "Balance Due", value: "$10.00" }),
		);
		expect(
			lines.some((line) => /Refunded|Card|Paid Toward Order/.test(line.label)),
		).toBe(false);
	});
	it("prints canonical Delivery and Labor extra costs once when legacy metadata mirrors them", () => {
		const footer = composeFooter(
			createSale({
				meta: {
					deliveryCost: 35,
					labor_cost: 20,
				},
				extraCosts: [
					{ type: "Delivery", label: "Delivery", amount: 35 },
					{ type: "Labor", label: "Labor", amount: 20 },
				] as PrintSalesData["extraCosts"],
			}),
			"invoice",
		);

		expect(footer?.lines.filter((line) => line.label === "Delivery")).toEqual([
			expect.objectContaining({ value: "$35.00" }),
		]);
		expect(footer?.lines.filter((line) => line.label === "Labor")).toEqual([
			expect.objectContaining({ value: "$20.00" }),
		]);
	});

	it("keeps legacy-only Delivery and Labor metadata printable", () => {
		const footer = composeFooter(
			createSale({
				meta: {
					deliveryCost: 35,
					labor_cost: 20,
				},
			}),
			"invoice",
		);

		expect(footer?.lines.filter((line) => line.label === "Delivery")).toEqual([
			expect.objectContaining({ value: "$35.00" }),
		]);
		expect(footer?.lines.filter((line) => line.label === "Labor")).toEqual([
			expect.objectContaining({ value: "$20.00" }),
		]);
	});

	it("omits additional costs that are not applicable", () => {
		const footer = composeFooter(
			createSale({
				meta: {
					deliveryCost: 0,
					labor_cost: 0,
				},
				extraCosts: [
					{ type: "Delivery", label: "Delivery", amount: 0 },
					{ type: "Labor", label: "Labor", amount: 0 },
				] as PrintSalesData["extraCosts"],
			}),
			"invoice",
		);

		expect(footer?.lines.some((line) => line.label === "Delivery")).toBe(false);
		expect(footer?.lines.some((line) => line.label === "Labor")).toBe(false);
	});

	it("shows only dealer-recorded customer payment on a customer invoice", () => {
		const footer = composeFooter(
			createSale({
				grandTotal: 950,
				amountDue: 0,
				payments: [],
				dealerCustomerPayment: { paidAmount: 950 },
			} as Partial<PrintSalesData>),
			"invoice",
		);
		expect(footer?.lines).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "Order Total", value: "$950.00" }),
				expect.objectContaining({
					label: "Customer Payment Recorded",
					value: "$950.00",
				}),
				expect.objectContaining({ label: "Balance Due", value: "$0.00" }),
			]),
		);
		expect(footer?.lines.some((line) => line.label === "Card Payment")).toBe(
			false,
		);
		expect(footer?.lines.some((line) => line.label.includes("C.C.C."))).toBe(
			false,
		);
		expect(footer?.suppressDefaultNotes).toBe(true);
	});
});
