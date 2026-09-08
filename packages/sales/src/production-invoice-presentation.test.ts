import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";
import {
	projectProductionInvoice,
	withProductionInvoices,
} from "./production-invoice-presentation";

const order = {
	id: 42,
	grandTotal: 1000,
	amountDue: 500,
	meta: { ccc: 12.34, ccc_percentage: 3.5, payment_option: "Credit Card" },
	customer: { id: 7, phoneNo: "555-0100" },
	shippingAddress: null,
	payments: [],
};

describe("Production invoice presentation", () => {
	it("uses canonical CCC repair and preserves partial-payment balances", () => {
		expect(projectProductionInvoice(order)).toMatchObject({
			id: 42,
			customerId: 7,
			accountNo: "555-0100",
			baseInvoiceTotal: 1000,
			displayCcc: 35,
			invoiceTotal: 1035,
			amountDue: 500,
			due: true,
			latestPaymentReview: null,
		});
	});

	it("preserves unpaid, paid and payment-review presentation", () => {
		expect(
			projectProductionInvoice({ ...order, amountDue: 1000 }).amountDue,
		).toBe(1000);
		expect(projectProductionInvoice({ ...order, amountDue: 0 }).due).toBe(
			false,
		);
		const receivedAt = new Date("2026-09-08T12:00:00Z");
		expect(
			projectProductionInvoice({
				...order,
				payments: [
					{
						id: 9,
						amount: 500,
						origin: "online",
						createdAt: receivedAt,
						reviewStatus: "needs_review",
					},
				],
			}).latestPaymentReview,
		).toEqual({
			paymentId: 9,
			amount: 500,
			origin: "online",
			receivedAt,
			reviewStatus: "needs_review",
		});
	});

	it("enriches only the returned page with one bounded review query", async () => {
		const calls: unknown[] = [];
		const db = {
			salesOrders: {
				findMany: async (query: unknown) => {
					calls.push(query);
					return [order];
				},
			},
		} as unknown as Db;
		const rows = [{ id: 42 }, { id: 43 }];
		const result = await withProductionInvoices(db, rows, true);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			where: { id: { in: [42, 43] }, deletedAt: null },
			select: {
				payments: {
					take: 1,
					orderBy: [{ createdAt: "desc" }, { id: "desc" }],
					where: {
						deletedAt: null,
						reviewStatus: "needs_review",
						status: { in: ["success", "completed", "paid"] },
					},
				},
			},
		});
		expect(result.map((row) => row.id)).toEqual([42, 43]);
		expect(result[0].invoicePresentation?.invoiceTotal).toBe(1035);
		expect(result[1].invoicePresentation).toBeNull();
	});

	it("does not query invoices for worker or empty pages", async () => {
		const db = {
			salesOrders: {
				findMany: () => {
					throw new Error("Unexpected invoice query");
				},
			},
		} as unknown as Db;
		expect(await withProductionInvoices(db, [{ id: 42 }], false)).toEqual([
			{ id: 42, invoicePresentation: null },
		]);
		expect(await withProductionInvoices(db, [], true)).toEqual([]);
	});
});
