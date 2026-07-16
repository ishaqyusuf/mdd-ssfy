// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
	autoReviewSalesPaymentsForOrderAction,
	defaultSalesPaymentReviewSettings,
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

		const result = await autoReviewSalesPaymentsForOrderAction(db as any, {
			salesId: 12,
			action: "production",
			settings: {
				autoReviewActions: {
					production: false,
				},
			},
		});

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

		const result = await autoReviewSalesPaymentsForOrderAction(db as any, {
			salesId: 12,
			action: "inbound",
			settings: {
				autoReviewActions: {
					inbound: true,
				},
			},
			reviewedById: 7,
			reviewNote: "Auto-reviewed after inbound creation.",
		});

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
});
