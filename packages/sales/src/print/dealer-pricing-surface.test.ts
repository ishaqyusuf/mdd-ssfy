import { describe, expect, it } from "bun:test";
import { resolveDealerPrintPricingSurface } from "./dealer-pricing-surface";

describe("dealer print pricing surface", () => {
	it("keeps the original customer total after reversing a rounded office conversion", () => {
		const sale = resolveDealerPrintPricingSurface(
			{
				dealerAuthId: 1,
				dealerSale: {
					dealerSalesPercentage: 25,
					grandTotal: 45.57,
					dueAmount: 45.57,
				},
				items: [
					{
						qty: 3,
						rate: 12.15,
						total: 36.46,
						shelfItems: [{ qty: 3, unitPrice: 12.15, totalPrice: 36.46 }],
					},
				],
			},
			"customer",
		);
		expect(sale.items[0]?.shelfItems[0]).toMatchObject({
			unitPrice: 15.19,
			totalPrice: 45.57,
		});
		expect(sale.grandTotal).toBe(45.57);
	});
	it("keeps office shelf line totals when rounded unit prices cannot represent the allocated cents", () => {
		const sale = resolveDealerPrintPricingSurface(
			{
				dealerAuthId: 1,
				items: [
					{
						qty: 3,
						rate: 12.15,
						total: 36.46,
						shelfItems: [{ qty: 3, unitPrice: 12.15, totalPrice: 36.46 }],
					},
				],
			},
			"internal",
		);
		expect(sale.items[0]?.shelfItems[0]).toMatchObject({
			unitPrice: 12.15,
			totalPrice: 36.46,
		});
	});
	it("allocates customer shelf cents across rows without a rounding gap", () => {
		const sale = resolveDealerPrintPricingSurface(
			{
				dealerAuthId: 1,
				dealerSale: { dealerSalesPercentage: 25 },
				items: [
					{
						qty: 3,
						total: 0.03,
						shelfItems: [
							{ qty: 1, unitPrice: 0.01, totalPrice: 0.01 },
							{ qty: 1, unitPrice: 0.01, totalPrice: 0.01 },
							{ qty: 1, unitPrice: 0.01, totalPrice: 0.01 },
						],
					},
				],
			},
			"customer",
		);
		expect(sale.items[0]?.shelfItems.map((row) => row.totalPrice)).toEqual([
			0.02, 0.01, 0.01,
		]);
	});
	it("uses customer-facing dealer pricing by default for dealer-owned sales", () => {
		const sale = resolveDealerPrintPricingSurface({
			dealerAuthId: 1,
			subTotal: 100,
			tax: 10,
			taxPercentage: 10,
			grandTotal: 110,
			amountDue: 110,
			dealerSale: {
				dealerSalesPercentage: 150,
				grandTotal: 275,
				dueAmount: 275,
			},
			items: [
				{
					qty: 2,
					rate: 50,
					total: 100,
					meta: {
						meta: {
							serviceRows: [{ qty: 2, unitPrice: 50, lineTotal: 100 }],
							mouldingRows: [{ qty: 2, salesPrice: 50, lineTotal: 100 }],
						},
					},
					shelfItems: [{ qty: 2, unitPrice: 50, totalPrice: 100 }],
					housePackageTool: {
						totalPrice: 100,
						doors: [
							{ totalQty: 2, unitPrice: 25, lineTotal: 50 },
							{ lhQty: 1, rhQty: 1, unitPrice: 25, lineTotal: 50 },
						],
					},
				},
			],
		});

		expect(sale.subTotal).toBe(250);
		expect(sale.tax).toBe(25);
		expect(sale.grandTotal).toBe(275);
		expect(sale.amountDue).toBe(275);
		expect(sale.items?.[0]?.rate).toBe(125);
		expect(sale.items?.[0]?.total).toBe(250);
		expect(sale.items?.[0]?.shelfItems?.[0]).toMatchObject({
			unitPrice: 125,
			totalPrice: 250,
		});
		expect(sale.items?.[0]?.housePackageTool?.doors?.[0]).toMatchObject({
			unitPrice: 62.5,
			lineTotal: 125,
		});
		expect(sale.items?.[0]?.housePackageTool?.doors?.[1]).toMatchObject({
			unitPrice: 62.5,
			lineTotal: 125,
		});
		expect(sale.items?.[0]?.meta.meta.serviceRows[0]).toMatchObject({
			unitPrice: 125,
			lineTotal: 250,
		});
		expect(sale.items?.[0]?.meta.meta.mouldingRows[0]).toMatchObject({
			salesPrice: 125,
			lineTotal: 250,
		});
	});

	it("keeps internal pricing when explicitly requested", () => {
		const input = {
			dealerAuthId: 1,
			subTotal: 100,
			tax: 10,
			taxPercentage: 10,
			grandTotal: 110,
			amountDue: 110,
			dealerSale: {
				dealerSalesPercentage: 150,
				grandTotal: 275,
				dueAmount: 275,
			},
			items: [
				{
					qty: 2,
					rate: 50,
					total: 100,
					meta: {},
					shelfItems: [{ qty: 2, unitPrice: 49, totalPrice: 98 }],
				},
			],
		};

		const sale = resolveDealerPrintPricingSurface(input, "internal");

		expect(sale).not.toBe(input);
		expect(sale.grandTotal).toBe(110);
		expect(sale.items?.[0]?.rate).toBe(50);
		expect(sale.items?.[0]?.shelfItems?.[0]).toMatchObject({
			unitPrice: 50,
			totalPrice: 100,
		});
	});

	it("keeps office card tenders off the customer invoice", () => {
		const input = {
			dealerAuthId: 1,
			subTotal: 760,
			tax: 0,
			taxPercentage: 0,
			grandTotal: 760,
			amountDue: 0,
			dealerSale: {
				dealerSalesPercentage: 25,
				grandTotal: 950,
				dueAmount: 0,
			},
			payments: [{ amount: 760, status: "completed", paymentMethod: "card" }],
			items: [{ qty: 2, rate: 380, total: 760, meta: {} }],
		};

		const customer = resolveDealerPrintPricingSurface(input, "customer");
		const internal = resolveDealerPrintPricingSurface(input, "internal");

		expect(customer.grandTotal).toBe(950);
		expect(customer.amountDue).toBe(0);
		expect(customer.payments).toEqual([]);
		expect(customer.dealerCustomerPayment).toEqual({ paidAmount: 950 });
		expect(internal.payments).toEqual(input.payments);
		expect(internal.grandTotal).toBe(760);
	});
});
