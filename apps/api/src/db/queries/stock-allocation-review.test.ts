import { describe, expect, test } from "bun:test";

import {
	approveBulkStockAllocationQuery,
	approveStockAllocationQuery,
	rejectStockAllocationQuery,
} from "./stock-allocation-review";

function makeCtx(tx: Record<string, unknown>) {
	const transactionCalls: unknown[] = [];

	return {
		db: {
			$transaction: async <T>(
				callback: (transaction: typeof tx) => Promise<T>,
			) => {
				transactionCalls.push(tx);
				return callback(tx);
			},
		},
		__transactionCalls: transactionCalls,
	} as any;
}

function makeSale(overrides: Record<string, unknown> = {}) {
	return {
		id: 100,
		orderId: "08661LM",
		status: null,
		prodStatus: null,
		deliveries: [],
		stat: [],
		...overrides,
	};
}

function makeAllocationForSale(sale: ReturnType<typeof makeSale>) {
	return {
		lineItemComponent: {
			parent: {
				sale,
			},
		},
	};
}

describe("stock allocation review query guards", () => {
	test("rejects single allocation approval for fulfilled parent orders before allocation writes", async () => {
		const calls: string[] = [];
		const ctx = makeCtx({
			stockAllocation: {
				findMany: async () => {
					calls.push("stockAllocation.findMany");
					return [
						makeAllocationForSale(
							makeSale({
								status: "Delivered",
							}),
						),
					];
				},
				findFirst: async () => {
					calls.push("stockAllocation.findFirst");
					return null;
				},
				updateMany: async () => {
					calls.push("stockAllocation.updateMany");
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findUnique: async () => {
					calls.push("lineItemComponents.findUnique");
					return null;
				},
			},
		});

		await expect(
			approveStockAllocationQuery(ctx, {
				allocationId: 801,
			}),
		).rejects.toThrow(
			"This order is fulfilled, so inventory is locked for review and repair only.",
		);

		expect(ctx.__transactionCalls).toHaveLength(1);
		expect(calls).toEqual(["stockAllocation.findMany"]);
	});

	test("rejects bulk allocation approval for cancelled parent orders before allocation writes", async () => {
		const calls: string[] = [];
		const ctx = makeCtx({
			stockAllocation: {
				findMany: async () => {
					calls.push("stockAllocation.findMany");
					return [
						makeAllocationForSale(
							makeSale({
								status: "Cancelled",
							}),
						),
					];
				},
				updateMany: async () => {
					calls.push("stockAllocation.updateMany");
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findUnique: async () => {
					calls.push("lineItemComponents.findUnique");
					return null;
				},
			},
		});

		await expect(
			approveBulkStockAllocationQuery(ctx, {
				allocationIds: [801, 802],
			}),
		).rejects.toThrow(
			"This order is cancelled, so inventory is locked for review and repair only.",
		);

		expect(ctx.__transactionCalls).toHaveLength(1);
		expect(calls).toEqual(["stockAllocation.findMany"]);
	});

	test("rejects allocation rejection when fulfillment is completed by delivery evidence", async () => {
		const calls: string[] = [];
		const ctx = makeCtx({
			stockAllocation: {
				findMany: async () => {
					calls.push("stockAllocation.findMany");
					return [
						makeAllocationForSale(
							makeSale({
								deliveries: [
									{
										status: "Completed",
										_count: {
											items: 1,
										},
									},
								],
							}),
						),
					];
				},
				findFirst: async () => {
					calls.push("stockAllocation.findFirst");
					return null;
				},
				updateMany: async () => {
					calls.push("stockAllocation.updateMany");
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findUnique: async () => {
					calls.push("lineItemComponents.findUnique");
					return null;
				},
			},
		});

		await expect(
			rejectStockAllocationQuery(ctx, {
				allocationId: 801,
			}),
		).rejects.toThrow(
			"This order is fulfilled, so inventory is locked for review and repair only.",
		);

		expect(ctx.__transactionCalls).toHaveLength(1);
		expect(calls).toEqual(["stockAllocation.findMany"]);
	});
});
