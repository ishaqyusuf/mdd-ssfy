import { describe, expect, test } from "bun:test";

import { repairSalesInventoryInboundStatusBackfill } from "./sales-inventory-inbound-ownership";

function makeCandidate(overrides: Record<string, unknown> = {}) {
	return {
		id: 501,
		orderId: "08661LM",
		status: "Open",
		inventoryStatus: "PENDING ORDER",
		...overrides,
	};
}

function makeLinkedInboundDemand(salesOrderId = 501) {
	return {
		id: 701,
		inboundShipmentItem: {
			inboundId: 77,
			inbound: {
				status: "open",
			},
		},
		lineItemComponent: {
			parent: {
				saleId: salesOrderId,
			},
		},
	};
}

function makeRepairDb(input: {
	candidateBatches: Array<Array<ReturnType<typeof makeCandidate>>>;
	updateCounts?: number[];
}) {
	const calls: Array<{ name: string; payload?: unknown }> = [];
	const candidateBatches = [...input.candidateBatches];
	const updateCounts = [...(input.updateCounts ?? [])];
	const tx = {
		salesOrders: {
			updateMany: async (payload: unknown) => {
				calls.push({ name: "salesOrders.updateMany", payload });
				return { count: updateCounts.shift() ?? 0 };
			},
		},
		salesHistory: {
			create: async (payload: unknown) => {
				calls.push({ name: "salesHistory.create", payload });
				return { id: 1 };
			},
		},
	};
	const db = {
		salesOrders: {
			findMany: async (payload: unknown) => {
				calls.push({ name: "salesOrders.findMany", payload });
				return candidateBatches.shift() ?? [];
			},
		},
		inboundDemand: {
			findMany: async (payload: unknown) => {
				calls.push({ name: "inboundDemand.findMany", payload });
				return [makeLinkedInboundDemand()];
			},
		},
		$transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) => {
			calls.push({ name: "$transaction" });
			return callback(tx);
		},
	};

	return { db: db as any, calls };
}

describe("repairSalesInventoryInboundStatusBackfill", () => {
	test("defaults to dry-run and does not enter the repair transaction", async () => {
		const { db, calls } = makeRepairDb({
			candidateBatches: [[makeCandidate()]],
		});

		const result = await repairSalesInventoryInboundStatusBackfill(db, {
			salesOrderIds: [501],
		});

		expect(result.dryRun).toBe(true);
		expect(result.appliedCount).toBe(0);
		expect(result.remainingMismatchCount).toBe(1);
		expect(calls.map((call) => call.name)).toEqual([
			"salesOrders.findMany",
			"inboundDemand.findMany",
		]);
	});

	test("guards apply by the exact legacy inventory status written to audit history", async () => {
		const { db, calls } = makeRepairDb({
			candidateBatches: [[makeCandidate()], []],
			updateCounts: [1],
		});

		const result = await repairSalesInventoryInboundStatusBackfill(db, {
			salesOrderIds: [501],
			dryRun: false,
			authorName: "Ops",
			triggeredByUserId: 42,
		});
		const updateCall = calls.find(
			(call) => call.name === "salesOrders.updateMany",
		);
		const historyCall = calls.find(
			(call) => call.name === "salesHistory.create",
		);

		expect(result.status).toBe("clean");
		expect(result.appliedCount).toBe(1);
		expect(result.skippedCount).toBe(0);
		expect(result.remainingMismatchCount).toBe(0);
		expect(updateCall?.payload).toMatchObject({
			where: {
				id: 501,
				inventoryStatus: "PENDING ORDER",
			},
			data: {
				inventoryStatus: "ORDERED",
			},
		});
		expect(historyCall?.payload).toMatchObject({
			data: {
				salesId: 501,
				authorName: "Ops",
				data: {
					type: "sales_inventory_inbound_status_backfill",
					previousInventoryStatus: "PENDING ORDER",
					nextInventoryStatus: "ORDERED",
					linkedInboundIds: [77],
					linkedDemandCount: 1,
					triggeredByUserId: 42,
				},
			},
		});
	});

	test("does not write audit history when the guarded repair apply is stale", async () => {
		const { db, calls } = makeRepairDb({
			candidateBatches: [
				[makeCandidate()],
				[makeCandidate({ inventoryStatus: "AVAILABLE" })],
			],
			updateCounts: [0],
		});

		const result = await repairSalesInventoryInboundStatusBackfill(db, {
			salesOrderIds: [501],
			dryRun: false,
			authorName: "Ops",
			triggeredByUserId: 42,
		});

		expect(result.status).toBe("needs_backfill");
		expect(result.appliedCount).toBe(0);
		expect(result.skippedSalesOrderReasons).toEqual([
			{
				salesOrderId: 501,
				reason: "changed_before_apply",
			},
		]);
		expect(result.remainingMismatchCount).toBe(1);
		expect(
			calls.some((call) => call.name === "salesHistory.create"),
		).toBe(false);
	});
});
