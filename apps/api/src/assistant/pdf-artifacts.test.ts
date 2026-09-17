import { describe, expect, test } from "bun:test";
import {
	cancelAssistantSalesPdfJob,
	getAssistantSalesPdfStatus,
	isAssistantSalesPdfModeSupported,
	queueAssistantSalesPdfJob,
} from "./pdf-artifacts";

describe("Assistant PDF artifact status", () => {
	const actor = {
		userId: 7,
		scopeType: "organization" as const,
		scopeId: "3",
	};
	const sourceRevision = "sales-source-revision-1";
	test("enforces order and quote document families", () => {
		expect(
			isAssistantSalesPdfModeSupported({ salesType: "quote", mode: "quote" }),
		).toBe(true);
		expect(
			isAssistantSalesPdfModeSupported({ salesType: "quote", mode: "invoice" }),
		).toBe(false);
		expect(
			isAssistantSalesPdfModeSupported({ salesType: "order", mode: "invoice" }),
		).toBe(true);
		expect(
			isAssistantSalesPdfModeSupported({ salesType: "order", mode: "quote" }),
		).toBe(false);
	});

	test("returns an on-demand state without creating a document", async () => {
		const result = await getAssistantSalesPdfStatus(
			{
				salesDocumentSnapshot: { findFirst: async () => null },
			} as never,
			{ salesOrderId: 42, sourceRevision: null, mode: "invoice" },
		);
		expect(result).toMatchObject({
			status: "on_demand",
			documentType: "invoice_pdf",
			documentId: null,
		});
	});

	test("returns only a current ready document and marks stale sources", async () => {
		const result = await getAssistantSalesPdfStatus(
			{
				salesDocumentSnapshot: {
					findFirst: async () => ({
						id: "snapshot-1",
						isCurrent: true,
						storedDocumentId: "document-1",
						generationStatus: "ready",
						sourceUpdatedAt: new Date("2026-09-12T10:00:00Z"),
						generatedAt: new Date("2026-09-12T10:01:00Z"),
						failedAt: null,
						updatedAt: new Date("2026-09-12T10:01:00Z"),
						meta: {
							expiresAt: "2099-09-19T10:01:00Z",
							sourceRevision: "old-revision",
						},
					}),
				},
				storedDocument: { findFirst: async () => ({ id: "document-1" }) },
			} as never,
			{
				salesOrderId: 42,
				sourceRevision,
				mode: "invoice",
			},
		);
		expect(result.status).toBe("stale");
		expect(result.documentId).toBeNull();
	});

	test("marks an in-flight snapshot stale when the source revision changes", async () => {
		const result = await getAssistantSalesPdfStatus(
			{
				salesDocumentSnapshot: {
					findFirst: async () => ({
						id: "snapshot-running-old",
						isCurrent: true,
						storedDocumentId: null,
						generationStatus: "generating",
						sourceUpdatedAt: new Date("2026-09-12T10:00:00Z"),
						generatedAt: null,
						failedAt: null,
						updatedAt: new Date("2026-09-12T10:01:00Z"),
						meta: { sourceRevision: "old-revision" },
					}),
				},
			} as never,
			{
				salesOrderId: 42,
				sourceRevision,
				mode: "invoice",
			},
		);
		expect(result).toMatchObject({
			status: "stale",
			snapshotId: "snapshot-running-old",
			documentId: null,
		});
	});

	test("reconnect status reads preserve a queued snapshot by durable id", async () => {
		const result = await getAssistantSalesPdfStatus(
			{
				salesDocumentSnapshot: {
					findFirst: async () => ({
						id: "snapshot-reconnect",
						isCurrent: true,
						storedDocumentId: null,
						generationStatus: "pending",
						sourceUpdatedAt: new Date("2026-09-12T10:00:00Z"),
						generatedAt: null,
						failedAt: null,
						updatedAt: new Date("2026-09-12T10:01:00Z"),
						meta: { sourceRevision },
					}),
				},
			} as never,
			{
				salesOrderId: 42,
				sourceRevision,
				mode: "invoice",
				snapshotId: "snapshot-reconnect",
			},
		);
		expect(result).toMatchObject({
			status: "queued",
			snapshotId: "snapshot-reconnect",
			documentId: null,
		});
	});

	test("retrieves a terminal cancelled job by its durable snapshot id", async () => {
		const result = await getAssistantSalesPdfStatus(
			{
				salesDocumentSnapshot: {
					findFirst: async () => ({
						id: "snapshot-cancelled",
						isCurrent: false,
						storedDocumentId: null,
						generationStatus: "cancelled",
						sourceUpdatedAt: new Date("2026-09-12T10:00:00Z"),
						generatedAt: null,
						failedAt: null,
						updatedAt: new Date("2026-09-12T10:01:00Z"),
						meta: {},
					}),
				},
			} as never,
			{
				salesOrderId: 42,
				sourceRevision,
				mode: "invoice",
				snapshotId: "snapshot-cancelled",
			},
		);
		expect(result).toMatchObject({
			status: "cancelled",
			snapshotId: "snapshot-cancelled",
			documentId: null,
		});
	});

	test("creates the durable pending snapshot before queueing exactly once", async () => {
		const triggerCalls: unknown[] = [];
		let findCount = 0;
		const db = {
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
				callback({
					salesDocumentSnapshot: {
						findFirst: async () => {
							findCount += 1;
							return findCount === 1 ? null : { version: 2 };
						},
						updateMany: async () => ({ count: 1 }),
						create: async ({ data }: { data: Record<string, unknown> }) => ({
							...data,
							id: "snapshot-3",
							meta: data.meta,
						}),
					},
				}),
			salesDocumentSnapshot: {
				update: async ({ data }: { data: unknown }) => data,
				updateMany: async () => ({ count: 1 }),
			},
		};
		const result = await queueAssistantSalesPdfJob(
			db as never,
			{
				salesOrderId: 42,
				salesUpdatedAt: "2026-09-13T08:00:00.000Z",
				mode: "invoice",
				sourceRevision,
				actor,
			},
			async (input) => {
				triggerCalls.push(input);
				return { id: "trigger-1" };
			},
		);
		expect(result).toEqual({
			jobId: "snapshot-3",
			triggerRunId: "trigger-1",
			status: "queued",
			reused: false,
		});
		expect(triggerCalls).toEqual([
			{
				snapshotId: "snapshot-3",
				salesOrderId: 42,
				mode: "invoice",
				forceRegenerate: undefined,
				idempotencyKey: "assistant-sales-pdf:snapshot-3",
				assistantRequest: {
					userId: actor.userId,
					scopeType: actor.scopeType,
					scopeId: actor.scopeId,
					sourceRevision,
				},
			},
		]);
	});

	test("reuses a source-matched durable job without triggering again", async () => {
		let triggered = false;
		const db = {
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
				callback({
					salesDocumentSnapshot: {
						findFirst: async () => ({
							id: "snapshot-1",
							generationStatus: "pending",
							meta: { sourceRevision },
							providerJobId: "trigger-1",
						}),
					},
				}),
		};
		const result = await queueAssistantSalesPdfJob(
			db as never,
			{
				salesOrderId: 42,
				salesUpdatedAt: "2026-09-13T08:00:00.000Z",
				mode: "invoice",
				sourceRevision,
				actor,
			},
			async () => {
				triggered = true;
				return { id: "unexpected" };
			},
		);
		expect(triggered).toBe(false);
		expect(result).toMatchObject({
			jobId: "snapshot-1",
			triggerRunId: "trigger-1",
			reused: true,
		});
	});

	test("retries a serializable version race and then reuses the winner", async () => {
		let transactions = 0;
		const result = await queueAssistantSalesPdfJob(
			{
				$transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
					transactions += 1;
					if (transactions === 1) throw { code: "P2002" };
					return callback({
						salesDocumentSnapshot: {
							findFirst: async () => ({
								id: "snapshot-winner",
								generationStatus: "generating",
								meta: { sourceRevision },
								providerJobId: "trigger-winner",
							}),
						},
					});
				},
			} as never,
			{
				salesOrderId: 42,
				salesUpdatedAt: "2026-09-13T08:00:00.000Z",
				mode: "invoice",
				sourceRevision,
				actor,
			},
			async () => {
				throw new Error("the winning job must be reused");
			},
		);
		expect(transactions).toBe(2);
		expect(result).toMatchObject({
			jobId: "snapshot-winner",
			status: "running",
			reused: true,
		});
	});

	test("dispatches one provider run for two concurrent callers", async () => {
		const state = {
			generationStatus: "pending",
			providerJobId: null as string | null,
			updatedAt: new Date(),
		};
		let triggerCount = 0;
		const db = {
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
				callback({
					salesDocumentSnapshot: {
						findFirst: async () => ({
							id: "snapshot-shared",
							meta: { sourceRevision },
							...state,
						}),
					},
				}),
			salesDocumentSnapshot: {
				updateMany: async ({
					where,
					data,
				}: {
					where: { providerJobId?: string | null };
					data: { providerJobId?: string };
				}) => {
					if (
						where.providerJobId !== undefined &&
						where.providerJobId !== state.providerJobId
					)
						return { count: 0 };
					if (data.providerJobId) state.providerJobId = data.providerJobId;
					state.updatedAt = new Date();
					return { count: 1 };
				},
				findUnique: async () => ({ ...state }),
			},
		};
		const request = {
			salesOrderId: 42,
			salesUpdatedAt: "2026-09-13T08:00:00.000Z",
			mode: "invoice" as const,
			sourceRevision,
			actor,
		};
		const trigger = async () => {
			triggerCount += 1;
			await Promise.resolve();
			return { id: "trigger-shared" };
		};
		const results = await Promise.all([
			queueAssistantSalesPdfJob(db as never, request, trigger),
			queueAssistantSalesPdfJob(db as never, request, trigger),
		]);
		expect(triggerCount).toBe(1);
		expect(results.map((result) => result.jobId)).toEqual([
			"snapshot-shared",
			"snapshot-shared",
		]);
	});

	test("recovers an expired dispatch claim with the same provider idempotency key", async () => {
		let triggerCount = 0;
		const state = {
			generationStatus: "pending",
			providerJobId: "dispatching:snapshot-old:claim-old",
			updatedAt: new Date(Date.now() - 5 * 60 * 1000),
		};
		const result = await queueAssistantSalesPdfJob(
			{
				$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
					callback({
						salesDocumentSnapshot: {
							findFirst: async () => ({
								id: "snapshot-old",
								meta: { sourceRevision },
								...state,
							}),
						},
					}),
				salesDocumentSnapshot: {
					updateMany: async ({ data }: { data: { providerJobId: string } }) => {
						state.providerJobId = data.providerJobId;
						return { count: 1 };
					},
					findUnique: async () => ({ ...state, isCurrent: true }),
				},
			} as never,
			{
				salesOrderId: 42,
				salesUpdatedAt: "2026-09-13T08:00:00.000Z",
				mode: "invoice",
				sourceRevision,
				actor,
			},
			async (input) => {
				triggerCount += 1;
				expect(input.idempotencyKey).toBe("assistant-sales-pdf:snapshot-old");
				return { id: "trigger-recovered" };
			},
		);
		expect(triggerCount).toBe(1);
		expect(result).toMatchObject({
			jobId: "snapshot-old",
			triggerRunId: "trigger-recovered",
			status: "queued",
		});
	});

	test("accepts a worker claim that wins the provider-id attachment race", async () => {
		let writes = 0;
		const state = {
			generationStatus: "pending",
			providerJobId: null as string | null,
			isCurrent: true,
		};
		const result = await queueAssistantSalesPdfJob(
			{
				$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
					callback({
						salesDocumentSnapshot: {
							findFirst: async () => null,
							updateMany: async () => ({ count: 1 }),
							create: async ({ data }: { data: Record<string, unknown> }) => ({
								...data,
								id: "snapshot-fast",
								providerJobId: null,
								updatedAt: new Date(),
							}),
						},
					}),
				salesDocumentSnapshot: {
					updateMany: async ({
						data,
					}: { data: { providerJobId?: string } }) => {
						writes += 1;
						if (writes === 1) {
							state.providerJobId = data.providerJobId ?? null;
							return { count: 1 };
						}
						return { count: 0 };
					},
					findUnique: async () => ({ ...state }),
				},
			} as never,
			{
				salesOrderId: 42,
				salesUpdatedAt: "2026-09-13T08:00:00.000Z",
				mode: "invoice",
				sourceRevision,
				actor,
			},
			async () => {
				state.providerJobId = "trigger-fast";
				state.generationStatus = "generating";
				return { id: "trigger-fast" };
			},
		);
		expect(result).toMatchObject({
			triggerRunId: "trigger-fast",
			status: "running",
		});
	});

	test("preserves a terminal worker outcome that wins provider-id attachment", async () => {
		let writes = 0;
		const state = {
			generationStatus: "pending",
			providerJobId: null as string | null,
			isCurrent: true,
		};
		let cancelledRunId: string | null = null;
		const result = await queueAssistantSalesPdfJob(
			{
				$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
					callback({
						salesDocumentSnapshot: {
							findFirst: async () => null,
							updateMany: async () => ({ count: 1 }),
							create: async ({ data }: { data: Record<string, unknown> }) => ({
								...data,
								id: "snapshot-terminal",
								providerJobId: null,
								updatedAt: new Date(),
							}),
						},
					}),
				salesDocumentSnapshot: {
					updateMany: async ({
						data,
					}: { data: { providerJobId?: string } }) => {
						writes += 1;
						if (writes === 1) {
							state.providerJobId = data.providerJobId ?? null;
							return { count: 1 };
						}
						return { count: 0 };
					},
					findUnique: async () => ({ ...state }),
				},
			} as never,
			{
				salesOrderId: 42,
				salesUpdatedAt: "2026-09-13T08:00:00.000Z",
				mode: "invoice",
				sourceRevision,
				actor,
			},
			async () => {
				state.providerJobId = "trigger-terminal";
				state.generationStatus = "failed";
				state.isCurrent = false;
				return { id: "trigger-terminal" };
			},
			async (runId) => {
				cancelledRunId = runId;
			},
		);
		expect(result).toMatchObject({
			triggerRunId: "trigger-terminal",
			status: "failed",
		});
		expect(cancelledRunId).toBeNull();
	});

	test("cancels only a current queued job and invalidates it before Trigger", async () => {
		const sequence: string[] = [];
		const result = await cancelAssistantSalesPdfJob(
			{
				salesDocumentSnapshot: {
					findFirst: async () => ({
						id: "snapshot-1",
						providerJobId: "trigger-1",
					}),
					updateMany: async () => {
						sequence.push("database");
						return { count: 1 };
					},
				},
			} as never,
			{ snapshotId: "snapshot-1", salesOrderId: 42, mode: "invoice" },
			async () => {
				sequence.push("trigger");
			},
		);
		expect(result).toBe(true);
		expect(sequence).toEqual(["database", "trigger"]);
	});

	test("cancels a dispatch claim without treating it as a provider run id", async () => {
		let providerCancelled = false;
		const result = await cancelAssistantSalesPdfJob(
			{
				salesDocumentSnapshot: {
					findFirst: async () => ({
						id: "snapshot-1",
						providerJobId: "dispatching:assistant-sales-pdf:snapshot-1",
					}),
					updateMany: async () => ({ count: 1 }),
				},
			} as never,
			{ snapshotId: "snapshot-1", salesOrderId: 42, mode: "invoice" },
			async () => {
				providerCancelled = true;
			},
		);
		expect(result).toBe(true);
		expect(providerCancelled).toBe(false);
	});
});
