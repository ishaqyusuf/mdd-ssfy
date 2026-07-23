import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { tasks } from "@trigger.dev/sdk/v3";
import {
	getInventoryImportRunHistory,
	queueInventoryImportRun,
} from "./inventory-import-runs";

function createContext() {
	const diagnosticUpsert = mock(async (args) => ({
		id: "diagnostic-1",
		runId: args.where.runId,
	}));
	const diagnosticCreate = mock(async (args) => ({
		id: "diagnostic-failure",
		...args.data,
	}));
	const historyRows = [
		{
			id: "diagnostic-1",
			runId: "run-1",
			status: "RUNNING",
			taskName: "run-inventory-full-import-now",
			title: "Inventory update",
			description: "active scope using the optimized strategy",
			actorName: "Inventory Operator",
			userMessage: null,
			internalError: null,
			outputSummary: null,
			metadata: { scope: "active" },
			startedAt: new Date("2026-07-23T10:00:00.000Z"),
			finishedAt: null,
			createdAt: new Date("2026-07-23T10:00:00.000Z"),
		},
	];
	const historyFindMany = mock(async () => historyRows);
	const ctx = {
		userId: 42,
		db: {
			users: {
				findFirst: async () => ({
					id: 42,
					name: "Inventory Operator",
					email: "operator@example.com",
					roles: [],
				}),
			},
			taskRunDiagnostic: {
				upsert: diagnosticUpsert,
				create: diagnosticCreate,
				findMany: historyFindMany,
			},
		},
	} as unknown as TRPCContext;

	return {
		ctx,
		diagnosticCreate,
		diagnosticUpsert,
		historyFindMany,
		historyRows,
	};
}

describe("inventory import run history", () => {
	beforeEach(() => {
		Reflect.set(
			tasks,
			"trigger",
			mock(async () => ({ id: "run-1" })),
		);
	});

	it("queues an authenticated import and persists its diagnostic identity", async () => {
		const { ctx, diagnosticUpsert } = createContext();

		const result = await queueInventoryImportRun(ctx, {
			scope: "active",
			strategy: "optimized",
			compare: false,
			reset: false,
			source: "manual",
		});

		expect(tasks.trigger).toHaveBeenCalledWith(
			"run-inventory-full-import-now",
			{
				categoryId: undefined,
				scope: "active",
				strategy: "optimized",
				compare: false,
				reset: false,
				source: "manual",
			},
		);
		expect(diagnosticUpsert).toHaveBeenCalledTimes(1);
		expect(diagnosticUpsert.mock.calls[0]?.[0]?.create).toMatchObject({
			runId: "run-1",
			status: "RUNNING",
			taskName: "run-inventory-full-import-now",
			actorId: 42,
			entityType: "inventory-import",
		});
		expect(result).toMatchObject({
			id: "run-1",
			diagnosticRecorded: true,
		});
	});

	it("records a start failure without replacing the original trigger error", async () => {
		const { ctx, diagnosticCreate } = createContext();
		const failure = new Error("Trigger unavailable");
		Reflect.set(
			tasks,
			"trigger",
			mock(async () => {
				throw failure;
			}),
		);

		await expect(
			queueInventoryImportRun(ctx, {
				scope: "all",
				strategy: "handcrafted",
				compare: true,
				reset: false,
				source: "manual",
			}),
		).rejects.toBe(failure);
		expect(diagnosticCreate.mock.calls[0]?.[0]?.data).toMatchObject({
			status: "START_FAILED",
			taskName: "run-inventory-full-import-test",
			actorId: 42,
			internalError: "Trigger unavailable",
		});
	});

	it("returns bounded inventory-only diagnostic history", async () => {
		const { ctx, historyFindMany, historyRows } = createContext();

		const result = await getInventoryImportRunHistory(ctx, { limit: 8 });

		expect(historyFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					deletedAt: null,
					taskName: {
						in: [
							"run-inventory-full-import-now",
							"run-inventory-full-import-test",
						],
					},
				},
				take: 8,
			}),
		);
		expect(historyFindMany.mock.calls[0]?.[0]?.select).not.toHaveProperty(
			"internalError",
		);
		expect(result).toEqual({
			runs: historyRows,
			limit: 8,
		});
	});
});
