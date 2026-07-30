import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import type { SalesFinanceTransactionSource } from "@gnd/sales/payment-system";

import {
	getSalesFinanceTransactions,
	resolveSalesFinanceReconciliation,
	startSalesFinanceReconciliation,
} from "./sales-finance";

function source(): SalesFinanceTransactionSource {
	return {
		id: 44,
		amount: 100,
		status: "success",
		paymentMethod: "check",
		createdAt: new Date("2026-07-29T12:00:00.000Z"),
		meta: { salesAmount: 100, customerChargeAmount: 100 },
		wallet: {
			customer: {
				id: 1,
				businessName: "Acme",
				name: "Ada",
			},
		},
		salesPayments: [
			{
				id: 1,
				amount: 100,
				order: {
					id: 1,
					orderId: "SO-1",
					customer: {
						id: 1,
						businessName: "Acme",
						name: "Ada",
					},
				},
			},
		],
	};
}

function reconciliationContext() {
	let transaction = source();
	const events: Array<{
		id: number;
		type: string;
		userId: number | null;
		createdAt: Date;
		data: Record<string, unknown>;
	}> = [];
	const ctx = {
		userId: 7,
		db: {
			customerTransaction: {
				findMany: async () => [transaction],
				findFirst: async () => transaction,
			},
			event: {
				findMany: async () => events,
				create: async ({
					data,
				}: {
					data: {
						type: string;
						userId?: number | null;
						data: Record<string, unknown>;
					};
				}) => {
					const event = {
						id: events.length + 1,
						type: data.type,
						userId: data.userId || null,
						createdAt: new Date(`2026-07-29T1${events.length}:00:00.000Z`),
						data: data.data,
					};
					events.push(event);
					return event;
				},
			},
		},
	} as unknown as TRPCContext;

	return {
		ctx,
		events,
		changeTransaction(next: SalesFinanceTransactionSource) {
			transaction = next;
		},
	};
}

describe("Sales Finance reconciliation queries", () => {
	it("opens and resolves append-only evidence, then removes the matching item from review", async () => {
		const state = reconciliationContext();

		const opened = await startSalesFinanceReconciliation(state.ctx, {
			id: 44,
			note: "Checking the paper deposit.",
		});
		expect(opened?.reconciliationStatus).toBe("in_progress");
		expect(opened?.needsReview).toBe(true);
		expect(state.events[0]?.data).toMatchObject({
			action: "opened",
			note: "Checking the paper deposit.",
		});

		const resolved = await resolveSalesFinanceReconciliation(state.ctx, {
			id: 44,
			resolution: "verified",
			note: "Deposit reference verified against the daily close.",
		});
		expect(resolved?.reconciliationStatus).toBe("resolved");
		expect(resolved?.rawNeedsReview).toBe(true);
		expect(resolved?.needsReview).toBe(false);
		expect(resolved?.reconciliationHistory).toHaveLength(2);

		const review = await getSalesFinanceTransactions(state.ctx, {
			tab: "review",
			size: 20,
			from: "2026-07-01",
			to: "2026-07-31",
		});
		expect(review.data).toHaveLength(0);
	});

	it("makes a prior resolution stale when the transaction evidence changes", async () => {
		const state = reconciliationContext();
		await startSalesFinanceReconciliation(state.ctx, { id: 44 });
		await resolveSalesFinanceReconciliation(state.ctx, {
			id: 44,
			resolution: "accepted_legacy",
			note: "Legacy check confirmed in the physical deposit register.",
		});

		state.changeTransaction({
			...source(),
			amount: 120,
			meta: { salesAmount: 120, customerChargeAmount: 120 },
		});
		const review = await getSalesFinanceTransactions(state.ctx, {
			tab: "review",
			size: 20,
			from: "2026-07-01",
			to: "2026-07-31",
		});

		expect(review.data).toHaveLength(1);
		expect(review.data[0]?.reconciliationStatus).toBe("stale");
		expect(review.data[0]?.needsReview).toBe(true);
	});

	it("requires an open session against current evidence before resolution", async () => {
		const state = reconciliationContext();

		await expect(
			resolveSalesFinanceReconciliation(state.ctx, {
				id: 44,
				resolution: "verified",
				note: "Reference verified against the daily close.",
			}),
		).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
	});
});
