import { expect, it } from "bun:test";
import { getSalesOrderPaymentReviews } from "./sales-order-payment-review";

it("keeps zero-amount reviewable payments actionable and distinguishes absent payments", async () => {
	let calls = 0;
	const db = {
		salesOrders: {
			findMany: async () => {
				calls++;
				return [
					{
						id: 1,
						payments: [
							{
								id: 10,
								amount: 0,
								origin: "office",
								createdAt: null,
								reviewStatus: "needs_review",
							},
						],
					},
					{ id: 2, payments: [] },
				];
			},
		},
	} as unknown as Parameters<typeof getSalesOrderPaymentReviews>[0];
	const result = await getSalesOrderPaymentReviews(db, [1, 2]);
	expect(result.get(1)).toEqual({
		paymentId: 10,
		amount: 0,
		origin: "office",
		receivedAt: null,
		reviewStatus: "needs_review",
	});
	expect(result.get(2)).toBe(null);
	expect(calls).toBe(1);
});

it("does not query when there are no loaded sales", async () => {
	const db = {
		salesOrders: {
			findMany: async () => {
				throw new Error("Unexpected query");
			},
		},
	} as unknown as Parameters<typeof getSalesOrderPaymentReviews>[0];
	expect((await getSalesOrderPaymentReviews(db, [])).size).toBe(0);
});
