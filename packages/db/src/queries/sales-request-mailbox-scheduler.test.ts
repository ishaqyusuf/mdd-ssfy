import { describe, expect, test } from "bun:test";
import { createSalesRequestMailboxSchedulerStore } from "./sales-request-mailbox-scheduler";

describe("Sales Request mailbox scheduler store", () => {
	test("returns only bounded opaque work IDs from each due-work source", async () => {
		const calls: Array<{ model: string; input: unknown }> = [];
		let connectionReads = 0;
		const db = {
			async $transaction<T>(run: (client: typeof db) => Promise<T>) {
				return run(db);
			},
			salesRequestMailboxSyncStream: {
				findMany: async (input: unknown) => {
					calls.push({ model: "sync", input });
					return [{ id: "stream-1" }];
				},
			},
			salesRequestMailboxMessageSummary: {
				findMany: async (input: unknown) => {
					calls.push({ model: "summary", input });
					return [{ id: "summary-1" }];
				},
			},
			salesRequestMailboxMessageLease: {
				findMany: async (input: unknown) => {
					calls.push({ model: "detail-retry", input });
					return [
						{ claimedSummaryId: "summary-2" },
						{ claimedSummaryId: "summary-1" },
					];
				},
			},
			salesRequestMailboxConnection: {
				findMany: async (input: unknown) => {
					connectionReads += 1;
					const model =
						connectionReads === 1
							? "health-candidates"
							: connectionReads === 2
								? "health"
								: "disconnect";
					calls.push({ model, input });
					if (model === "health-candidates") return [];
					if (model === "health") {
						return [
							{
								healthOperationId: "health-1",
								healthOperationConnectionRevision: 3,
								revision: 3,
							},
						];
					}
					return [{ disconnectId: "disconnect-1" }];
				},
				updateMany: async () => ({ count: 0 }),
			},
		};
		const now = new Date("2026-09-13T17:00:00.000Z");
		const store = createSalesRequestMailboxSchedulerStore(db as never);

		await expect(store.findDueWork({ now, limit: 25 })).resolves.toEqual({
			syncWorkIds: ["stream-1"],
			detailWorkIds: ["summary-1", "summary-2"],
			tokenHealthWorkIds: ["health-1"],
			disconnectWorkIds: ["disconnect-1"],
		});
		expect(calls).toHaveLength(6);
		for (const call of calls) {
			expect(call.input).toMatchObject({ take: 25 });
		}
		expect(calls.find((call) => call.model === "health")?.input).toMatchObject({
			where: {
				state: "active",
				healthOperationId: { not: null },
				OR: [
					{ healthStatus: "queued", healthNextAttemptAt: { lte: now } },
					{
						healthStatus: "temporarily-unavailable",
						healthNextAttemptAt: { lte: now },
					},
					{ healthStatus: "claimed", healthLeaseExpiresAt: { lte: now } },
				],
			},
		});
		expect(
			calls.find((call) => call.model === "disconnect")?.input,
		).toMatchObject({
			where: {
				state: "disconnecting",
				disconnectId: { not: null },
				disconnectCompletedAt: null,
			},
		});
	});

	test("creates bounded token-expiry work with a connection revision CAS", async () => {
		const now = new Date("2026-09-13T17:00:00.000Z");
		const updates: unknown[] = [];
		let connectionReads = 0;
		const db = {
			async $transaction<T>(run: (client: typeof db) => Promise<T>) {
				return run(db);
			},
			salesRequestMailboxSyncStream: { findMany: async () => [] },
			salesRequestMailboxMessageSummary: { findMany: async () => [] },
			salesRequestMailboxMessageLease: { findMany: async () => [] },
			salesRequestMailboxConnection: {
				findMany: async () => {
					connectionReads += 1;
					if (connectionReads === 1) {
						return [
							{
								id: "connection-1",
								revision: 4,
								healthOperationId: null,
								healthOperationConnectionRevision: null,
							},
							{
								id: "connection-2",
								revision: 7,
								healthOperationId: "health-completed-previous-revision",
								healthOperationConnectionRevision: 6,
							},
							{
								id: "connection-3",
								revision: 9,
								healthOperationId: "health-current-revision",
								healthOperationConnectionRevision: 9,
							},
						];
					}
					if (connectionReads === 2) {
						return [
							{
								healthOperationId: "health-created-1",
								healthOperationConnectionRevision: 4,
								revision: 4,
							},
							{
								healthOperationId: "health-created-2",
								healthOperationConnectionRevision: 7,
								revision: 7,
							},
						];
					}
					return [];
				},
				updateMany: async (input: unknown) => {
					updates.push(input);
					return { count: 1 };
				},
			},
		};
		const operationIds = ["health-created-1", "health-created-2"];
		const store = createSalesRequestMailboxSchedulerStore(db as never, {
			createHealthOperationId: () => {
				const operationId = operationIds.shift();
				if (!operationId) throw new Error("Unexpected health operation");
				return operationId;
			},
		});

		await expect(store.findDueWork({ now, limit: 10 })).resolves.toEqual({
			syncWorkIds: [],
			detailWorkIds: [],
			tokenHealthWorkIds: ["health-created-1", "health-created-2"],
			disconnectWorkIds: [],
		});
		expect(updates).toEqual([
			expect.objectContaining({
				where: {
					id: "connection-1",
					revision: 4,
					state: "active",
					syncBlocked: false,
					healthStatus: "healthy",
					healthOperationId: null,
					healthOperationConnectionRevision: null,
				},
				data: {
					healthOperationId: "health-created-1",
					healthOperationReason: "token-expiring",
					healthOperationConnectionRevision: 4,
					healthStatus: "queued",
					healthRetryAttempt: 0,
					healthNextAttemptAt: now,
				},
			}),
			expect.objectContaining({
				where: {
					id: "connection-2",
					revision: 7,
					state: "active",
					syncBlocked: false,
					healthStatus: "healthy",
					healthOperationId: "health-completed-previous-revision",
					healthOperationConnectionRevision: 6,
				},
				data: {
					healthOperationId: "health-created-2",
					healthOperationReason: "token-expiring",
					healthOperationConnectionRevision: 7,
					healthStatus: "queued",
					healthRetryAttempt: 0,
					healthNextAttemptAt: now,
				},
			}),
		]);
	});

	test("rejects an unbounded or invalid sweep", async () => {
		const store = createSalesRequestMailboxSchedulerStore({} as never);
		await expect(
			store.findDueWork({ now: new Date("invalid"), limit: 25 }),
		).rejects.toThrow("valid scheduler time");
		await expect(
			store.findDueWork({ now: new Date(), limit: 501 }),
		).rejects.toThrow("between 1 and 500");
	});
});
