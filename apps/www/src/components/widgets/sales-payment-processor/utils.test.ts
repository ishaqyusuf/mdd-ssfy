import { describe, expect, it } from "bun:test";
import { buildPrintRequests, resolveDefaultPaymentMethod } from "./utils";

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

	it("defaults to credit card when the selected sale has no payment method", () => {
		expect(
			resolveDefaultPaymentMethod(
				[
					{ id: 1, paymentMethod: "Check" },
					{ id: 2, paymentMethod: null },
				],
				[2],
			),
		).toBe("credit-card");
	});

	it("defaults to credit card when no order payment method exists", () => {
		expect(
			resolveDefaultPaymentMethod([{ id: 1, paymentMethod: null }], [1]),
		).toBe("credit-card");
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
});
