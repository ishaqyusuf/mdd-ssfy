import { describe, expect, test } from "bun:test";

import { runSalesInventoryProjectionSync } from "./run-sales-inventory-projection-sync";

describe("runSalesInventoryProjectionSync", () => {
	test("records a successful zero-need projection", async () => {
		const projectionWrites: unknown[] = [];
		const db = {
			salesInventoryProjectionState: {
				upsert: async (payload: unknown) => {
					projectionWrites.push(payload);
					return {};
				},
			},
			lineItemComponents: {
				aggregate: async () => ({
					_count: { _all: 0 },
					_sum: { qty: null },
				}),
			},
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
				callback(db),
		};

		const result = await runSalesInventoryProjectionSync(
			db as never,
			{
				salesOrderId: 42,
				source: "new-form",
				triggeredByUserId: 7,
			},
			{
				syncLineItems: async () => ({
					salesOrderId: 42,
					createdCount: 0,
					updatedCount: 0,
					deletedCount: 0,
					skippedCount: 0,
					warnings: [],
				}),
			},
		);

		expect(result.projection).toEqual({
			status: "ready",
			needCount: 0,
			requiredQty: 0,
		});
		expect(projectionWrites).toHaveLength(2);
		expect(projectionWrites[0]).toMatchObject({
			where: { salesOrderId: 42 },
			create: {
				salesOrderId: 42,
				status: "syncing",
				source: "new-form",
			},
		});
		expect(projectionWrites[1]).toMatchObject({
			where: { salesOrderId: 42 },
			update: {
				status: "ready",
				needCount: 0,
				requiredQty: 0,
				lastError: null,
			},
		});
	});

	test("records partial sync warnings as a failed projection", async () => {
		const projectionWrites: any[] = [];
		const db = {
			salesInventoryProjectionState: {
				upsert: async (payload: unknown) => {
					projectionWrites.push(payload);
					return {};
				},
			},
			lineItemComponents: {
				aggregate: async () => ({
					_count: { _all: 2 },
					_sum: { qty: 6 },
				}),
			},
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
				callback(db),
		};

		const result = await runSalesInventoryProjectionSync(
			db as never,
			{
				salesOrderId: 43,
				source: "old-form",
			},
			{
				syncLineItems: async () => ({
					salesOrderId: 43,
					createdCount: 1,
					updatedCount: 0,
					deletedCount: 0,
					skippedCount: 1,
					warnings: ["salesItem:9: missing inventory mapping"],
				}),
			},
		);

		expect(result.projection).toEqual({
			status: "failed",
			needCount: 2,
			requiredQty: 6,
		});
		expect(projectionWrites.at(-1)?.update).toMatchObject({
			status: "failed",
			needCount: 2,
			requiredQty: 6,
			lastError: "salesItem:9: missing inventory mapping",
		});
	});

	test("records a thrown synchronization error before rethrowing", async () => {
		const projectionWrites: any[] = [];
		const db = {
			salesInventoryProjectionState: {
				upsert: async (payload: unknown) => {
					projectionWrites.push(payload);
					return {};
				},
			},
			lineItemComponents: {
				aggregate: async () => ({
					_count: { _all: 0 },
					_sum: { qty: null },
				}),
			},
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
				callback(db),
		};

		await expect(
			runSalesInventoryProjectionSync(
				db as never,
				{
					salesOrderId: 44,
					source: "repair",
				},
				{
					syncLineItems: async () => {
						throw new Error("broken mapping");
					},
				},
			),
		).rejects.toThrow("broken mapping");
		expect(projectionWrites.at(-1)?.update).toMatchObject({
			status: "failed",
			lastError: "broken mapping",
		});
	});
});
