import { describe, expect, test } from "bun:test";

import { runSalesInventoryProjectionSync } from "./run-sales-inventory-projection-sync";

function trackedRequirement(qty: number) {
	return {
		qty,
		inventoryId: 10,
		inventoryVariantId: 20,
		inventory: {
			id: 10,
			productKind: "inventory",
			stockMode: "monitored",
		},
		inventoryVariant: { id: 20 },
		inventoryCategory: null,
		subComponent: null,
	};
}

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
				findMany: async () => [],
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

	test("excludes untracked and non-inventory components from projection needs", async () => {
		const projectionWrites: unknown[] = [];
		const db = {
			salesInventoryProjectionState: {
				upsert: async (payload: unknown) => {
					projectionWrites.push(payload);
					return {};
				},
			},
			lineItemComponents: {
				findMany: async () => [
					{
						qty: 2,
						inventoryId: 10,
						inventoryVariantId: 20,
						inventory: {
							id: 10,
							productKind: "inventory",
							stockMode: "monitored",
						},
						inventoryVariant: { id: 20 },
						inventoryCategory: null,
						subComponent: null,
					},
					{
						qty: 4,
						inventoryId: 11,
						inventoryVariantId: 21,
						inventory: {
							id: 11,
							productKind: "inventory",
							stockMode: "unmonitored",
						},
						inventoryVariant: { id: 21 },
						inventoryCategory: null,
						subComponent: null,
					},
					{
						qty: 6,
						inventoryId: 12,
						inventoryVariantId: 22,
						inventory: {
							id: 12,
							productKind: "component",
							stockMode: "monitored",
						},
						inventoryVariant: { id: 22 },
						inventoryCategory: null,
						subComponent: null,
					},
				],
			},
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
				callback(db),
		};

		const result = await runSalesInventoryProjectionSync(
			db as never,
			{
				salesOrderId: 45,
				source: "manual",
			},
			{
				syncLineItems: async () => ({
					salesOrderId: 45,
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
			needCount: 1,
			requiredQty: 2,
		});
	});

	test("records partial sync warnings as a failed projection", async () => {
		const projectionWrites: unknown[] = [];
		const db = {
			salesInventoryProjectionState: {
				upsert: async (payload: unknown) => {
					projectionWrites.push(payload);
					return {};
				},
			},
			lineItemComponents: {
				findMany: async () => [trackedRequirement(2), trackedRequirement(4)],
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
		expect(projectionWrites.at(-1)).toMatchObject({
			update: {
				status: "failed",
				needCount: 2,
				requiredQty: 6,
				lastError: "salesItem:9: missing inventory mapping",
			},
		});
	});

	test("records a thrown synchronization error before rethrowing", async () => {
		const projectionWrites: unknown[] = [];
		const db = {
			salesInventoryProjectionState: {
				upsert: async (payload: unknown) => {
					projectionWrites.push(payload);
					return {};
				},
			},
			lineItemComponents: {
				findMany: async () => [],
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
		expect(projectionWrites.at(-1)).toMatchObject({
			update: {
				status: "failed",
				lastError: "broken mapping",
			},
		});
	});
});
