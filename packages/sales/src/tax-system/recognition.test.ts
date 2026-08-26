import { describe, expect, it } from "bun:test";

import {
	buildSalesTaxRecognitionSnapshot,
	recognizeSalesTaxForFulfilledOrder,
} from "./recognition";

describe("buildSalesTaxRecognitionSnapshot", () => {
	it("separates invoice, gross, exempt, state, and county amounts in cents", () => {
		expect(
			buildSalesTaxRecognitionSnapshot({
				orderNo: "SO-1",
				customerName: "Acme",
				subTotal: 1_000,
				grandTotal: 1_065,
				tax: 65,
				taxes: [
					{ taxCode: "A", taxxable: 500, tax: 5 },
					{ taxCode: "B", taxxable: 900, tax: 60 },
				],
			}),
		).toEqual({
			orderNo: "SO-1",
			customerName: "Acme",
			invoiceTotalCents: 106_500,
			grossSalesCents: 100_000,
			exemptSalesCents: 10_000,
			taxableAmountCents: 90_000,
			stateTaxCents: 6_000,
			surtaxCents: 500,
			taxDueCents: 6_500,
			taxCode: "A,B",
		});
	});
});

describe("recognizeSalesTaxForFulfilledOrder", () => {
	it("recognizes a fulfilled credit sale without consulting payment balance", async () => {
		let created: unknown;
		const db = {
			salesTaxLedgerEntry: {
				findUnique: async () => null,
				upsert: async (args: { create: unknown }) => {
					created = args.create;
					return {
						id: "tax-1",
						recognizedAt: new Date("2026-08-10T15:00:00Z"),
					};
				},
			},
			salesOrders: {
				findFirst: async () => ({
					id: 10,
					orderId: "SO-10",
					status: "processing",
					deliveredAt: null,
					deliveryOption: "delivery",
					subTotal: 100,
					grandTotal: 107,
					tax: 7,
					customer: { businessName: "Acme", name: null },
					billingAddress: null,
					pickup: null,
					taxes: [{ taxCode: "B", taxxable: 100, tax: 7 }],
					stat: [{ percentage: 100 }],
					deliveries: [
						{
							id: 40,
							deliveryMode: "delivery",
							deliveredAt: new Date("2026-08-10T15:00:00Z"),
						},
					],
				}),
			},
		};

		const result = await recognizeSalesTaxForFulfilledOrder(db as never, {
			salesOrderId: 10,
		});

		expect(result.status).toBe("recognized");
		expect(created).toMatchObject({
			salesOrderId: 10,
			recognizedAt: new Date("2026-08-10T15:00:00Z"),
			invoiceTotalCents: 10_700,
			taxableAmountCents: 10_000,
			taxDueCents: 700,
		});
		expect(JSON.stringify(created)).not.toContain("amountDue");
	});

	it("does not recognize a partial fulfillment", async () => {
		const db = {
			salesTaxLedgerEntry: { findUnique: async () => null },
			salesOrders: {
				findFirst: async () => ({
					id: 11,
					orderId: "SO-11",
					status: "processing",
					stat: [{ percentage: 50 }],
					deliveries: [
						{ id: 41, deliveredAt: new Date(), deliveryMode: "delivery" },
					],
				}),
			},
		};

		await expect(
			recognizeSalesTaxForFulfilledOrder(db as never, { salesOrderId: 11 }),
		).resolves.toEqual({
			status: "not_recognizable",
			reason: "not_fulfilled",
		});
	});

	it("snapshots billing-name fallback and null money as zero", async () => {
		let created: Record<string, unknown> | undefined;
		const db = {
			salesTaxLedgerEntry: {
				findUnique: async () => null,
				upsert: async (args: { create: Record<string, unknown> }) => {
					created = args.create;
					return {
						id: "tax-12",
						recognizedAt: new Date("2026-08-25T14:00:00Z"),
					};
				},
			},
			salesOrders: {
				findFirst: async () => ({
					id: 12,
					orderId: "SO-12",
					status: "completed",
					deliveredAt: new Date("2026-08-25T14:00:00Z"),
					subTotal: null,
					grandTotal: null,
					tax: null,
					customer: { businessName: null, name: null },
					billingAddress: { name: "Billing customer" },
					pickup: null,
					taxes: [],
					stat: [],
					deliveries: [],
				}),
			},
		};

		await recognizeSalesTaxForFulfilledOrder(db as never, { salesOrderId: 12 });

		expect(created).toMatchObject({
			customerName: "Billing customer",
			invoiceTotalCents: 0,
			grossSalesCents: 0,
			taxableAmountCents: 0,
			taxDueCents: 0,
		});
	});
});
