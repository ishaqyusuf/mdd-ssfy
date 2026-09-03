import { describe, expect, it, mock } from "bun:test";

import type { Db, TransactionClient } from "@gnd/db";

import { resolveSalesPipelineSnapshot } from "./sales-pipeline";
import {
	SalesPipelineCommandRejectedError,
	runSalesPipelineCommandTransaction,
} from "./sales-pipeline-command-executor";

function snapshot() {
	return resolveSalesPipelineSnapshot({
		salesOrderId: 1,
		orderNo: "09502PC",
		commercial: { status: "open" },
		payment: { total: 100, amountDue: 0 },
		material: { applicability: "required", requiredQty: 1, readyQty: 1 },
		production: {
			configuredRequirement: true,
			requiredQty: 1,
			assignments: [],
			submissions: [],
		},
		fulfillment: {
			configuredRequirement: true,
			requiredQty: 1,
			packedQty: 0,
			dispatches: [],
		},
	});
}

function transactionHarness() {
	const tx = { salesOrders: { findFirst: mock(async () => ({ id: 1 })) } };
	const db = {
		$transaction: async (callback: (client: unknown) => Promise<unknown>) =>
			callback(tx),
	} as unknown as Db;
	return { db, tx: tx as unknown as TransactionClient };
}

describe("runSalesPipelineCommandTransaction", () => {
	it("locks, recomputes, and validates the revision before executing", async () => {
		const current = snapshot();
		const events: string[] = [];
		const { db } = transactionHarness();
		const result = await runSalesPipelineCommandTransaction(
			db,
			{
				salesOrderId: 1,
				action: "production.assign",
				authorized: true,
				expectedRevision: current.revision,
				enforce: true,
				operation: "test.pipeline-command",
			},
			async (transactionDb) => {
				events.push("execute");
				const nested = await transactionDb.$transaction(async () => "nested");
				return nested;
			},
			{
				lockSalesOrder: async () => {
					events.push("lock");
				},
				getSnapshots: async () => {
					events.push("snapshot");
					return new Map([[1, current]]);
				},
			},
		);

		expect(events).toEqual(["lock", "snapshot", "execute"]);
		expect(result).toMatchObject({ executed: true, value: "nested" });
	});

	it("rejects a stale revision inside the transaction without executing", async () => {
		const execute = mock(async () => "should-not-run");
		const { db } = transactionHarness();

		expect(
			runSalesPipelineCommandTransaction(
				db,
				{
					salesOrderId: 1,
					action: "production.assign",
					authorized: true,
					expectedRevision: "stale",
					enforce: true,
					operation: "test.pipeline-command",
				},
				execute,
				{
					lockSalesOrder: async () => undefined,
					getSnapshots: async () => new Map([[1, snapshot()]]),
				},
			),
		).rejects.toBeInstanceOf(SalesPipelineCommandRejectedError);
		expect(execute).not.toHaveBeenCalled();
	});

	it("requires a revision whenever canonical commands are enforced", async () => {
		const execute = mock(async () => "should-not-run");
		const { db } = transactionHarness();

		expect(
			runSalesPipelineCommandTransaction(
				db,
				{
					salesOrderId: 1,
					action: "production.assign",
					authorized: true,
					enforce: true,
					operation: "test.pipeline-command",
				},
				execute,
				{
					lockSalesOrder: async () => undefined,
					getSnapshots: async () => new Map([[1, snapshot()]]),
				},
			),
		).rejects.toMatchObject({
			decision: { reasons: ["REVISION_REQUIRED"] },
		});
		expect(execute).not.toHaveBeenCalled();
	});

	it("can execute a command-specific idempotency check for canonical replays", async () => {
		const current = snapshot();
		const execute = mock(async () => "command-replay");
		const { db } = transactionHarness();

		const result = await runSalesPipelineCommandTransaction(
			db,
			{
				salesOrderId: 1,
				action: "production.unassign",
				authorized: true,
				expectedRevision: current.revision,
				enforce: true,
				executeOnReplay: true,
				operation: "test.pipeline-command-replay",
			},
			execute,
			{
				lockSalesOrder: async () => undefined,
				getSnapshots: async () => new Map([[1, current]]),
			},
		);

		expect(execute).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({ executed: true, value: "command-replay" });
	});
});
