// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
	autoReviewSalesPaymentsForOrderAction,
	defaultSalesPaymentReviewSettings,
	markSalesPaymentsReviewed,
	resolveSalesPaymentOrigin,
} from "./payment-review";

describe("sales payment review", () => {
	it("classifies payment origin by payment method", () => {
		expect(resolveSalesPaymentOrigin("link")).toBe("online");
		expect(resolveSalesPaymentOrigin("cash")).toBe("office");
		expect(resolveSalesPaymentOrigin(null)).toBe("office");
	});

	it("defaults every auto-review action off", () => {
		expect(defaultSalesPaymentReviewSettings()).toEqual({
			autoReviewActions: {
				production: false,
				fulfillment: false,
				inbound: false,
			},
		});
	});

	it("does not update payments when the action is disabled", async () => {
		let calls = 0;
		const db = {
			salesPayments: {
				updateMany() {
					calls += 1;
					return Promise.resolve({ count: 1 });
				},
			},
		};

		const result = await autoReviewSalesPaymentsForOrderAction(
			db as unknown as Parameters<
				typeof autoReviewSalesPaymentsForOrderAction
			>[0],
			{
				salesId: 12,
				action: "production",
				settings: {
					autoReviewActions: {
						production: false,
					},
				},
			},
		);

		expect(result).toEqual({ count: 0 });
		expect(calls).toBe(0);
	});

	it("marks clean payments reviewed when the action is enabled", async () => {
		let payload: unknown;
		const db = {
			salesPayments: {
				updateMany(input: unknown) {
					payload = input;
					return Promise.resolve({ count: 2 });
				},
			},
		};

		const result = await autoReviewSalesPaymentsForOrderAction(
			db as unknown as Parameters<
				typeof autoReviewSalesPaymentsForOrderAction
			>[0],
			{
				salesId: 12,
				action: "inbound",
				settings: {
					autoReviewActions: {
						inbound: true,
					},
				},
				reviewedById: 7,
				reviewNote: "Auto-reviewed after inbound creation.",
			},
		);

		expect(result).toEqual({ count: 2 });
		expect(payload).toMatchObject({
			where: {
				orderId: 12,
				deletedAt: null,
				reviewStatus: "needs_review",
				status: {
					in: ["success", "completed", "paid"],
				},
			},
			data: {
				reviewStatus: "reviewed",
				reviewMethod: "auto",
				reviewedByAction: "inbound",
				reviewedById: 7,
				reviewNote: "Auto-reviewed after inbound creation.",
			},
		});
	});

	it("reviews the latest eligible payment for each selected order in one transaction", async () => {
		let findManyPayload: unknown;
		let updateManyPayload: unknown;
		const tx = {
			salesPayments: {
				findMany(payload: unknown) {
					findManyPayload = payload;
					return Promise.resolve([
						{
							id: 102,
							orderId: 12,
							order: { id: 12, orderId: "ORDER-12", type: "order" },
						},
						{
							id: 101,
							orderId: 12,
							order: { id: 12, orderId: "ORDER-12", type: "order" },
						},
						{
							id: 201,
							orderId: 13,
							order: { id: 13, orderId: "ORDER-13", type: "order" },
						},
					]);
				},
				updateMany(payload: unknown) {
					updateManyPayload = payload;
					return Promise.resolve({ count: 2 });
				},
			},
		};
		const db = {
			$transaction: async <T>(
				callback: (transaction: typeof tx) => Promise<T>,
			) => callback(tx),
		};

		const result = await markSalesPaymentsReviewed(
			db as unknown as Parameters<typeof markSalesPaymentsReviewed>[0],
			{
				salesIds: [12, 12, 13, 14],
				reviewedById: 7,
				reviewNote: "Reviewed from batch Mark as menu.",
			},
		);

		expect(findManyPayload).toMatchObject({
			where: {
				orderId: { in: [12, 13, 14] },
				deletedAt: null,
				reviewStatus: "needs_review",
				status: { in: ["success", "completed", "paid"] },
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		});
		expect(updateManyPayload).toMatchObject({
			where: {
				id: { in: [102, 201] },
				reviewStatus: "needs_review",
			},
			data: {
				reviewStatus: "reviewed",
				reviewMethod: "manual",
				reviewedById: 7,
				reviewNote: "Reviewed from batch Mark as menu.",
			},
		});
		expect(result).toEqual({
			reviewed: [
				{
					paymentId: 102,
					salesId: 12,
					orderId: "ORDER-12",
					type: "order",
				},
				{
					paymentId: 201,
					salesId: 13,
					orderId: "ORDER-13",
					type: "order",
				},
			],
			skipped: [{ salesId: 14, reason: "no_payment_needs_review" }],
		});
	});

	it("reports every selected order as skipped when no payment needs review", async () => {
		let updateCalls = 0;
		const tx = {
			salesPayments: {
				findMany: async () => [],
				updateMany: async () => {
					updateCalls += 1;
					return { count: 0 };
				},
			},
		};
		const db = {
			$transaction: async <T>(
				callback: (transaction: typeof tx) => Promise<T>,
			) => callback(tx),
		};

		const result = await markSalesPaymentsReviewed(
			db as unknown as Parameters<typeof markSalesPaymentsReviewed>[0],
			{
				salesIds: [21, 22],
				reviewedById: 7,
			},
		);

		expect(updateCalls).toBe(0);
		expect(result).toEqual({
			reviewed: [],
			skipped: [
				{ salesId: 21, reason: "no_payment_needs_review" },
				{ salesId: 22, reason: "no_payment_needs_review" },
			],
		});
	});
});
