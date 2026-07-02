import { describe, expect, test } from "bun:test";

import { resolveSalesInventoryLegacyStatusSetup } from "./sales-inventory-legacy-status-setup";

function makeDb(tx: Record<string, unknown>) {
	return {
		$transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) =>
			callback(tx),
	} as any;
}

function lockedOverview(status = "ORDERED") {
	return {
		setupMode: "legacy_status_locked",
		inventoryStatus: status,
	} as any;
}

describe("resolveSalesInventoryLegacyStatusSetup", () => {
	test("resets legacy inbound status only when the reviewed baseline still matches", async () => {
		const calls: string[] = [];
		let updateArgs: unknown;
		let historyArgs: any;
		let syncArgs: unknown;
		const tx = {
			salesOrders: {
				updateMany: async (args: unknown) => {
					calls.push("salesOrders.updateMany");
					updateArgs = args;
					return { count: 1 };
				},
			},
			salesHistory: {
				create: async (args: any) => {
					calls.push("salesHistory.create");
					historyArgs = args;
					return { id: 10 };
				},
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 5,
				action: "reset",
				authorName: "Inventory",
				triggeredByUserId: 7,
			},
			{
				getOverview: async () => lockedOverview("PENDING ORDER"),
				syncLineItems: async (_tx: unknown, args: unknown) => {
					calls.push("syncSalesInventoryLineItems");
					syncArgs = args;
					return { syncedLineItemCount: 2 };
				},
			} as any,
		);

		expect(calls).toEqual([
			"salesOrders.updateMany",
			"salesHistory.create",
			"syncSalesInventoryLineItems",
		]);
		expect(updateArgs).toEqual({
			where: {
				id: 5,
				inventoryStatus: "PENDING ORDER",
			},
			data: {
				inventoryStatus: null,
			},
		});
		expect(historyArgs.data.data).toMatchObject({
			action: "reset",
			previousInventoryStatus: "PENDING ORDER",
			nextInventoryStatus: null,
			triggeredByUserId: 7,
		});
		expect(syncArgs).toEqual({
			salesOrderId: 5,
			source: "manual",
			triggeredByUserId: 7,
		});
		expect(result).toMatchObject({
			syncedLineItemCount: 2,
			action: "reset",
			previousInventoryStatus: "PENDING ORDER",
		});
	});

	test("does not write audit history or sync when reset baseline is stale", async () => {
		const calls: string[] = [];
		const tx = {
			salesOrders: {
				updateMany: async () => {
					calls.push("salesOrders.updateMany");
					return { count: 0 };
				},
			},
			salesHistory: {
				create: async () => {
					calls.push("salesHistory.create");
					return { id: 10 };
				},
			},
		};

		let error: Error | null = null;
		try {
			await resolveSalesInventoryLegacyStatusSetup(
				makeDb(tx),
				{
					salesOrderId: 5,
					action: "reset",
				},
				{
					getOverview: async () => lockedOverview(),
					syncLineItems: async () => {
						calls.push("syncSalesInventoryLineItems");
						return {};
					},
				} as any,
			);
		} catch (caught) {
			error = caught as Error;
		}

		expect(error?.message).toBe(
			"Inventory inbound status changed before setup could run.",
		);
		expect(calls).toEqual(["salesOrders.updateMany"]);
	});

	test("guards override against the exact reviewed legacy status", async () => {
		const calls: string[] = [];
		let findArgs: unknown;
		const tx = {
			salesOrders: {
				findFirst: async (args: unknown) => {
					calls.push("salesOrders.findFirst");
					findArgs = args;
					return { id: 5 };
				},
			},
			salesHistory: {
				create: async () => {
					calls.push("salesHistory.create");
					return { id: 10 };
				},
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 5,
				action: "override",
				triggeredByUserId: 7,
			},
			{
				getOverview: async () => lockedOverview("ORDERED"),
				syncLineItems: async () => {
					calls.push("syncSalesInventoryLineItems");
					return { syncedLineItemCount: 1 };
				},
			} as any,
		);

		expect(calls).toEqual([
			"salesOrders.findFirst",
			"salesHistory.create",
			"syncSalesInventoryLineItems",
		]);
		expect(findArgs).toEqual({
			where: {
				id: 5,
				inventoryStatus: "ORDERED",
			},
			select: {
				id: true,
			},
		});
		expect(result).toMatchObject({
			syncedLineItemCount: 1,
			action: "override",
			previousInventoryStatus: "ORDERED",
		});
	});
});
