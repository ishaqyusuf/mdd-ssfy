import { describe, expect, it } from "bun:test";
import { reviewSelectedPayments } from "./review-selected-payments";

describe("review selected payments", () => {
	it("uses one batch mutation and waits for one scoped invalidation", async () => {
		const mutationInputs: unknown[] = [];
		const invalidationScopes: unknown[] = [];
		const completionEvents: string[] = [];
		let releaseInvalidation: (() => void) | undefined;
		let completed = false;

		const operation = reviewSelectedPayments({
			salesIds: [12, 13],
			review: async (input) => {
				mutationInputs.push(input);
				return {
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
					skipped: [],
				};
			},
			invalidate: (sales) => {
				invalidationScopes.push(sales);
				completionEvents.push("invalidate");
				return new Promise<void>((resolve) => {
					releaseInvalidation = resolve;
				});
			},
			onPaymentReviewed: () => completionEvents.push("selection-cleared"),
			closeMenu: () => completionEvents.push("menu-closed"),
		});
		void operation.then(() => {
			completed = true;
		});

		await Promise.resolve();
		expect(completed).toBe(false);
		expect(completionEvents).toEqual(["invalidate"]);
		expect(mutationInputs).toEqual([
			{
				salesIds: [12, 13],
				note: "Reviewed from batch Mark as menu.",
			},
		]);
		expect(invalidationScopes).toEqual([
			[
				{ orderNo: "ORDER-12", salesId: 12, salesType: "order" },
				{ orderNo: "ORDER-13", salesId: 13, salesType: "order" },
			],
		]);

		releaseInvalidation?.();
		const result = await operation;
		expect(completed).toBe(true);
		expect(completionEvents).toEqual([
			"invalidate",
			"selection-cleared",
			"menu-closed",
		]);
		expect(result.reviewed).toHaveLength(2);
	});

	it("does not invalidate when every selected order is already stale", async () => {
		const invalidationScopes: unknown[] = [];
		const completionEvents: string[] = [];
		const result = await reviewSelectedPayments({
			salesIds: [21, 22],
			review: async () => ({
				reviewed: [],
				skipped: [
					{ salesId: 21, reason: "no_payment_needs_review" as const },
					{ salesId: 22, reason: "no_payment_needs_review" as const },
				],
			}),
			invalidate: async (sales) => {
				invalidationScopes.push(sales);
			},
			onPaymentReviewed: () => completionEvents.push("selection-cleared"),
			closeMenu: () => completionEvents.push("menu-closed"),
		});

		expect(invalidationScopes).toEqual([]);
		expect(completionEvents).toEqual(["selection-cleared", "menu-closed"]);
		expect(result.skipped).toHaveLength(2);
	});
});
