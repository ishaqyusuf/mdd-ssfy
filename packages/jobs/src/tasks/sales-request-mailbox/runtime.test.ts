import { describe, expect, test } from "bun:test";
import type {
	MailboxDisconnectDependencies,
	MailboxMessageDetailDependencies,
	MailboxRetentionCleanupStore,
	MailboxSyncDependencies,
	MailboxTokenHealthDependencies,
} from "@gnd/sales-request-mailbox";
import {
	SALES_REQUEST_MAILBOX_DETAIL_LEASE_MS,
	SALES_REQUEST_MAILBOX_SYNC_LEASE_MS,
	type SalesRequestMailboxJobWorkStore,
	createSalesRequestMailboxJobRuntime,
	mailboxDisconnectJobPayloadSchema,
	mailboxMessageDetailJobPayloadSchema,
	mailboxRetentionJobPayloadSchema,
	mailboxSyncJobPayloadSchema,
	mailboxTokenHealthJobPayloadSchema,
} from "./runtime";

function unavailable(message: string): never {
	throw new Error(message);
}

function lifecycleDependencies(input: {
	syncClaims: unknown[];
	detailClaims: unknown[];
	healthClaims: unknown[];
	disconnectClaims: unknown[];
	retentionClaims: unknown[];
}) {
	const sync: MailboxSyncDependencies = {
		adapters: {},
		store: {
			claimLease: async (claim) => {
				input.syncClaims.push(claim);
				return { kind: "not-found" };
			},
			commitPageAndCheckpoint: async () => unavailable("unused sync commit"),
			checkpointCursorReset: async () => unavailable("unused sync reset"),
			settleSuppressed: async () => unavailable("unused sync suppression"),
			settleComplete: async () => unavailable("unused sync completion"),
			settleContinuation: async () => unavailable("unused sync continuation"),
			settleRetry: async () => unavailable("unused sync retry"),
			settleReauthorization: async () => unavailable("unused sync reauth"),
			settleDeadLetter: async () => unavailable("unused sync dead letter"),
		},
	};
	const detail: MailboxMessageDetailDependencies = {
		adapters: {},
		store: {
			claimLease: async (claim) => {
				input.detailClaims.push(claim);
				return { kind: "not-found" };
			},
			commitSnapshotAndQueue: async () => unavailable("unused detail commit"),
			withdrawCurrentProjection: async () =>
				unavailable("unused detail withdrawal"),
			settleRetry: async () => unavailable("unused detail retry"),
			settleReauthorization: async () => unavailable("unused detail reauth"),
			settleDeadLetter: async () => unavailable("unused detail dead letter"),
		},
	};
	const tokenHealth: MailboxTokenHealthDependencies = {
		adapters: {},
		keyRing: {
			active: () => unavailable("unused active key"),
			resolve: () => unavailable("unused key resolution"),
		},
		store: {
			claimTokenHealth: async (claim) => {
				input.healthClaims.push(claim);
				return { kind: "not-due" };
			},
			commitRefreshedTokens: async () =>
				unavailable("unused token refresh commit"),
			settleTokenHealth: async () => unavailable("unused token settlement"),
		},
	};
	const disconnect: MailboxDisconnectDependencies = {
		adapters: {},
		keyRing: { resolve: () => unavailable("unused disconnect key") },
		store: {
			claimDisconnect: async (claim) => {
				input.disconnectClaims.push(claim);
				return { kind: "completed" };
			},
			recordProviderRevoked: async () =>
				unavailable("unused provider revocation"),
			recordDisconnectFailure: async () =>
				unavailable("unused disconnect failure"),
			completeDisconnect: async () =>
				unavailable("unused disconnect completion"),
		},
	};
	const retention: MailboxRetentionCleanupStore = {
		purgeExpiredMailboxData: async (claim) => {
			input.retentionClaims.push(claim);
			return {
				counts: {
					queueRows: 0,
					memberships: 0,
					leases: 0,
					summaries: 0,
					snapshots: 0,
					oauthAttempts: 0,
				},
				hasMore: false,
			};
		},
	};

	return { sync, detail, tokenHealth, disconnect, retention };
}

function workStore(input?: {
	resolved?: boolean;
	resolutionCalls?: Array<{ kind: string; input: unknown }>;
}): SalesRequestMailboxJobWorkStore {
	const resolution = input?.resolved === false ? "not-found" : "ready";
	return {
		resolveSyncWork: async (work) => {
			input?.resolutionCalls?.push({ kind: "sync", input: work });
			return resolution === "not-found"
				? { kind: "not-found" }
				: {
						kind: "ready",
						work: {
							connectionId: "connection-1",
							source: {
								kind: "gmail-label",
								labelId: "INBOX",
								key: "gmail:label:INBOX",
							},
						},
					};
		},
		resolveMessageDetailWork: async (work) => {
			input?.resolutionCalls?.push({ kind: "detail", input: work });
			return resolution === "not-found"
				? { kind: "not-found" }
				: {
						kind: "ready",
						work: {
							connectionId: "connection-1",
							source: {
								kind: "graph-folder",
								folderId: "folder-1",
								key: "graph:folder:folder-1",
							},
							providerMessageId: "message-1",
							expectedSummaryRevision: 4,
						},
					};
		},
		resolveTokenHealthWork: async (work) => {
			input?.resolutionCalls?.push({ kind: "health", input: work });
			return resolution === "not-found"
				? { kind: "not-found" }
				: {
						kind: "ready",
						work: {
							connectionId: "connection-1",
							expectedConnectionRevision: 7,
							reason: "forced-health-check",
						},
					};
		},
		resolveDisconnectWork: async (work) => {
			input?.resolutionCalls?.push({ kind: "disconnect", input: work });
			return resolution === "not-found"
				? { kind: "not-found" }
				: {
						kind: "ready",
						work: {
							actorUserId: 42,
							connectionId: "connection-1",
							expectedConnectionRevision: 7,
						},
					};
		},
	};
}

describe("Sales Request mailbox job payloads", () => {
	test("accept only one bounded durable work reference", () => {
		for (const schema of [
			mailboxSyncJobPayloadSchema,
			mailboxMessageDetailJobPayloadSchema,
			mailboxTokenHealthJobPayloadSchema,
			mailboxDisconnectJobPayloadSchema,
		]) {
			expect(schema.parse({ workId: "work-1" })).toEqual({ workId: "work-1" });
			expect(schema.safeParse({ workId: "x".repeat(256) }).success).toBe(false);
		}

		const forbiddenPayloads = [
			{ workId: "work-1", actorUserId: 42 },
			{ workId: "work-1", source: { kind: "gmail-label", labelId: "INBOX" } },
			{ workId: "work-1", providerMessageId: "message-1" },
			{ workId: "work-1", accessToken: "secret" },
			{ workId: "work-1", body: "customer request content" },
		];
		for (const payload of forbiddenPayloads) {
			expect(mailboxSyncJobPayloadSchema.safeParse(payload).success).toBe(
				false,
			);
		}
	});

	test("retention accepts only an empty scheduler-owned payload", () => {
		expect(mailboxRetentionJobPayloadSchema.parse({})).toEqual({});
		expect(
			mailboxRetentionJobPayloadSchema.safeParse({ limit: 500 }).success,
		).toBe(false);
		expect(
			mailboxRetentionJobPayloadSchema.safeParse({ before: "2099-01-01" })
				.success,
		).toBe(false);
	});
});

describe("Sales Request mailbox job runtime", () => {
	test("resolves authority server-side before invoking lifecycle claims", async () => {
		const now = new Date("2026-09-13T14:00:00.000Z");
		const calls = {
			syncClaims: [] as unknown[],
			detailClaims: [] as unknown[],
			healthClaims: [] as unknown[],
			disconnectClaims: [] as unknown[],
			retentionClaims: [] as unknown[],
		};
		const resolutionCalls: Array<{ kind: string; input: unknown }> = [];
		const runtime = createSalesRequestMailboxJobRuntime({
			work: workStore({ resolutionCalls }),
			...lifecycleDependencies(calls),
			clock: () => now,
		});

		await expect(
			runtime.sync({ workId: "sync-work" }, { runId: "sync-run-1" }),
		).resolves.toEqual({ kind: "not-found" });
		await expect(
			runtime.detail({ workId: "detail-work" }, { runId: "detail-run-1" }),
		).resolves.toEqual({ kind: "not-found" });
		await expect(
			runtime.tokenHealth({ workId: "health-work" }, { runId: "health-run-1" }),
		).resolves.toEqual({ kind: "not-due" });
		await expect(
			runtime.disconnect(
				{ workId: "disconnect-work" },
				{ runId: "disconnect-run-1" },
			),
		).resolves.toEqual({ kind: "disconnected" });
		await expect(
			runtime.retention({}, { runId: "retention-run-1" }),
		).resolves.toMatchObject({ hasMore: false });

		expect(resolutionCalls).toEqual([
			{ kind: "sync", input: { workId: "sync-work" } },
			{ kind: "detail", input: { workId: "detail-work" } },
			{ kind: "health", input: { workId: "health-work" } },
			{ kind: "disconnect", input: { workId: "disconnect-work" } },
		]);
		expect(calls.syncClaims).toEqual([
			{
				runId: "sync-run-1",
				connectionId: "connection-1",
				source: {
					kind: "gmail-label",
					labelId: "INBOX",
					key: "gmail:label:INBOX",
				},
				now,
				leaseExpiresAt: new Date(
					now.getTime() + SALES_REQUEST_MAILBOX_SYNC_LEASE_MS,
				),
			},
		]);
		expect(calls.detailClaims).toEqual([
			{
				runId: "detail-run-1",
				leaseScope: {
					kind: "connection-provider-message",
					connectionId: "connection-1",
					providerMessageId: "message-1",
				},
				sourceMembership: {
					source: {
						kind: "graph-folder",
						folderId: "folder-1",
						key: "graph:folder:folder-1",
					},
					expectedSummaryRevision: 4,
				},
				now,
				leaseExpiresAt: new Date(
					now.getTime() + SALES_REQUEST_MAILBOX_DETAIL_LEASE_MS,
				),
			},
		]);
		expect(calls.healthClaims).toEqual([
			expect.objectContaining({
				connectionId: "connection-1",
				expectedConnectionRevision: 7,
				operationId: "health-work",
				reason: "forced-health-check",
				now,
			}),
		]);
		expect(calls.disconnectClaims).toEqual([
			expect.objectContaining({
				actorUserId: 42,
				connectionId: "connection-1",
				expectedConnectionRevision: 7,
				now,
			}),
		]);
		expect(calls.retentionClaims).toEqual([
			expect.objectContaining({ limit: 200 }),
		]);
	});

	test("an unresolved or forged work reference cannot claim lifecycle work", async () => {
		const calls = {
			syncClaims: [] as unknown[],
			detailClaims: [] as unknown[],
			healthClaims: [] as unknown[],
			disconnectClaims: [] as unknown[],
			retentionClaims: [] as unknown[],
		};
		const runtime = createSalesRequestMailboxJobRuntime({
			work: workStore({ resolved: false }),
			...lifecycleDependencies(calls),
		});

		await expect(
			runtime.disconnect(
				{ workId: "forged-reference" },
				{ runId: "disconnect-run-1" },
			),
		).resolves.toEqual({ kind: "work-not-found" });
		expect(calls).toEqual({
			syncClaims: [],
			detailClaims: [],
			healthClaims: [],
			disconnectClaims: [],
			retentionClaims: [],
		});
	});

	test("a cancelled task does not resolve or claim durable work", async () => {
		const calls = {
			syncClaims: [] as unknown[],
			detailClaims: [] as unknown[],
			healthClaims: [] as unknown[],
			disconnectClaims: [] as unknown[],
			retentionClaims: [] as unknown[],
		};
		const resolutionCalls: Array<{ kind: string; input: unknown }> = [];
		const runtime = createSalesRequestMailboxJobRuntime({
			work: workStore({ resolutionCalls }),
			...lifecycleDependencies(calls),
		});
		const controller = new AbortController();
		controller.abort();

		for (const [handler, runId] of [
			[runtime.sync, "sync-run-1"],
			[runtime.detail, "detail-run-1"],
			[runtime.tokenHealth, "health-run-1"],
			[runtime.disconnect, "disconnect-run-1"],
			[runtime.retention, "retention-run-1"],
		] as const) {
			await expect(
				handler(handler === runtime.retention ? {} : { workId: "work-1" }, {
					runId,
					signal: controller.signal,
				}),
			).resolves.toEqual({ kind: "cancelled" });
		}
		expect(resolutionCalls).toEqual([]);
		expect(calls).toEqual({
			syncClaims: [],
			detailClaims: [],
			healthClaims: [],
			disconnectClaims: [],
			retentionClaims: [],
		});
	});

	test("disconnect cannot claim after cancellation during work resolution", async () => {
		const calls = {
			syncClaims: [] as unknown[],
			detailClaims: [] as unknown[],
			healthClaims: [] as unknown[],
			disconnectClaims: [] as unknown[],
			retentionClaims: [] as unknown[],
		};
		const controller = new AbortController();
		const baseWork = workStore();
		const runtime = createSalesRequestMailboxJobRuntime({
			work: {
				...baseWork,
				resolveDisconnectWork: async (input) => {
					const resolved = await baseWork.resolveDisconnectWork(input);
					controller.abort();
					return resolved;
				},
			},
			...lifecycleDependencies(calls),
		});

		await expect(
			runtime.disconnect(
				{ workId: "disconnect-work" },
				{ runId: "disconnect-run-1", signal: controller.signal },
			),
		).resolves.toEqual({ kind: "cancelled" });
		expect(calls.disconnectClaims).toEqual([]);
	});

	test("rejects unknown fields before resolving durable work", async () => {
		const resolutionCalls: Array<{ kind: string; input: unknown }> = [];
		const runtime = createSalesRequestMailboxJobRuntime({
			work: workStore({ resolutionCalls }),
			...lifecycleDependencies({
				syncClaims: [],
				detailClaims: [],
				healthClaims: [],
				disconnectClaims: [],
				retentionClaims: [],
			}),
		});

		await expect(
			runtime.sync(
				{ workId: "work-1", refreshToken: "forbidden" },
				{ runId: "sync-run-1" },
			),
		).rejects.toThrow();
		expect(resolutionCalls).toEqual([]);
	});
});
