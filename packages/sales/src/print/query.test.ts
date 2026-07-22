import { describe, expect, it } from "bun:test";
import { PrintSalesInclude, buildPrintSalesInclude } from "./query";

const expectedDealerSaleSelect = {
	select: {
		dealerSalesPercentage: true,
		dueAmount: true,
	},
};

describe("buildPrintSalesInclude", () => {
	it("skips financial and packing relations for production mode", () => {
		const include = buildPrintSalesInclude("production");

		expect(include.extraCosts).toBeUndefined();
		expect(include.payments).toBeUndefined();
		expect(include.taxes).toBeUndefined();
		expect(include.deliveries).toBeUndefined();
	});

	it("loads financial relations for invoice mode without packing relations", () => {
		const include = buildPrintSalesInclude("invoice");

		expect(include.extraCosts).toBe(true);
		expect(include.payments).toBeTruthy();
		expect(include.taxes).toBeTruthy();
		expect(include.deliveries).toBeUndefined();
	});

	it("loads both financial and packing relations for order-packing mode", () => {
		const include = buildPrintSalesInclude("order-packing");

		expect(include.extraCosts).toBe(true);
		expect(include.payments).toBeTruthy();
		expect(include.taxes).toBeTruthy();
		expect(include.deliveries).toBeTruthy();
	});

	it("selects only the dealer-sale fields required by print pricing", () => {
		expect(JSON.stringify(buildPrintSalesInclude("quote").dealerSale)).toBe(
			JSON.stringify(expectedDealerSaleSelect),
		);
		expect(JSON.stringify(PrintSalesInclude.dealerSale)).toBe(
			JSON.stringify(expectedDealerSaleSelect),
		);
	});
});
