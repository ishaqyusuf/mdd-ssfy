import { describe, expect, test } from "bun:test";
import {
	DEFAULT_MAILBOX_SYNC_BUDGET,
	type MailboxConnectionConfiguration,
	type MailboxMessageSummary,
	MailboxProviderError,
	type MailboxSyncPage,
	type MailboxSyncStore,
	type MailboxSyncStoreLease,
	type SalesRequestMailboxAdapter,
	type SalesRequestMailboxPolicy,
	resolveMailboxSyncSources,
	runMailboxSyncStream,
} from "./index";

function connection(
	overrides: Partial<MailboxConnectionConfiguration> = {},
): MailboxConnectionConfiguration {
	return {
		organizationId: 10,
		ownerUserId: 20,
		provider: "gmail",
		providerAccountId: "account-1",
		accountEmail: "rep@example.com",
		folderIds: [],
		labelIds: [],
		excludedSenders: [],
		excludedDomains: [],
		automationMode: "manual",
		notifyOnNeedsReview: true,
		...overrides,
	};
}

function policy(
	overrides: Partial<SalesRequestMailboxPolicy> = {},
): SalesRequestMailboxPolicy {
	return {
		enabled: true,
		supportedProviders: ["gmail", "microsoft-graph"],
		eligibleUserIds: [20],
		retentionDays: 30,
		maximumAutomationMode: "manual",
		emergencyDisabled: false,
		allowAttachments: false,
		maxAttachmentBytes: 0,
		revision: 1,
		changedAt: "2026-09-01T00:00:00.000Z",
		...overrides,
	};
}

function summary(
	providerMessageId: string,
	overrides: Partial<MailboxMessageSummary> = {},
): MailboxMessageSummary {
	return {
		providerMessageId,
		labelIds: ["INBOX"],
		fromEmail: "customer@example.com",
		receivedAt: new Date("2026-09-12T10:00:00.000Z"),
		hasAttachments: false,
		headers: {},
		...overrides,
	};
}

function adapter(
	provider: "gmail" | "microsoft-graph",
	outcomes: Array<MailboxSyncPage | Error>,
) {
	const listInputs: Parameters<
		SalesRequestMailboxAdapter["listMessages"]
	>[0][] = [];
	const value = {
		provider,
		listInputs,
		api: {
			provider,
			async createAuthorizationUrl() {
				throw new Error("not-used");
			},
			async exchangeAuthorizationCode() {
				throw new Error("not-used");
			},
			async refreshTokens() {
				throw new Error("not-used");
			},
			async revoke() {
				throw new Error("not-used");
			},
			async listMessages(input) {
				listInputs.push(input);
				const outcome = outcomes.shift();
				if (!outcome) throw new Error("missing-test-outcome");
				if (outcome instanceof Error) throw outcome;
				return outcome;
			},
			async getMessage() {
				throw new Error("detail-fetch-not-allowed");
			},
		} satisfies SalesRequestMailboxAdapter,
	};
	return value;
}

function claimedLease(
	overrides: Partial<MailboxSyncStoreLease> = {},
): MailboxSyncStoreLease {
	return {
		connectionId: "connection-1",
		leaseFence: {
			leaseId: "lease-1",
			epoch: 7,
			expiresAt: new Date("2026-09-13T12:01:00.000Z"),
		},
		authorityFence: {
			organizationId: 10,
			ownerUserId: 20,
			provider: "gmail",
			connectionRevision: 3,
			policyRevision: 1,
			ownerActive: true,
			connectionActive: true,
		},
		connection: connection(),
		policy: policy(),
		tokens: { accessToken: "secret", grantedScopes: [] },
		checkpoint: null,
		...overrides,
	};
}

function store(
	claim:
		| { kind: "contended" | "not-found" }
		| { kind: "claimed"; lease: MailboxSyncStoreLease } = {
		kind: "claimed",
		lease: claimedLease(),
	},
) {
	const calls = {
		claims: [] as unknown[],
		commits: [] as unknown[],
		resets: [] as unknown[],
		settlements: [] as Array<{ kind: string; value: unknown }>,
	};
	const applied = { kind: "applied" } as const;
	const api: MailboxSyncStore = {
		async claimLease(input) {
			calls.claims.push(input);
			return claim;
		},
		async commitPageAndCheckpoint(input) {
			calls.commits.push(input);
			return applied;
		},
		async checkpointCursorReset(input) {
			calls.resets.push(input);
			return applied;
		},
		async settleSuppressed(value) {
			calls.settlements.push({ kind: "suppressed", value });
			return applied;
		},
		async settleComplete(value) {
			calls.settlements.push({ kind: "complete", value });
			return applied;
		},
		async settleContinuation(value) {
			calls.settlements.push({ kind: "continuation", value });
			return applied;
		},
		async settleRetry(value) {
			calls.settlements.push({ kind: "retry", value });
			return applied;
		},
		async settleReauthorization(value) {
			calls.settlements.push({ kind: "reauthorization", value });
			return applied;
		},
		async settleDeadLetter(value) {
			calls.settlements.push({ kind: "dead-letter", value });
			return applied;
		},
	};
	return { api, calls };
}

const gmailInbox = {
	kind: "gmail-label",
	labelId: "INBOX",
	key: "gmail:label:INBOX",
} as const;

const runInput = {
	runId: "run-1",
	connectionId: "connection-1",
	source: gmailInbox,
	now: new Date("2026-09-13T12:00:00.000Z"),
	leaseDurationMs: 60_000,
	clock: () => new Date("2026-09-13T12:00:10.000Z"),
} as const;

describe("mailbox synchronization orchestration", () => {
	test("resolves deterministic provider-specific streams and Inbox defaults", () => {
		expect(resolveMailboxSyncSources(connection())).toEqual([
			{ kind: "gmail-label", labelId: "INBOX", key: "gmail:label:INBOX" },
		]);
		expect(
			resolveMailboxSyncSources(
				connection({ labelIds: ["STARRED", "INBOX", "STARRED"] }),
			),
		).toEqual([
			{ kind: "gmail-label", labelId: "INBOX", key: "gmail:label:INBOX" },
			{ kind: "gmail-label", labelId: "STARRED", key: "gmail:label:STARRED" },
		]);
		expect(
			resolveMailboxSyncSources(
				connection({ provider: "microsoft-graph", folderIds: [] }),
			),
		).toEqual([
			{ kind: "graph-folder", folderId: "inbox", key: "graph:folder:inbox" },
		]);
	});

	test("rejects source selections that are irrelevant to the provider", () => {
		expect(() =>
			resolveMailboxSyncSources(connection({ folderIds: ["archive"] })),
		).toThrow("provider-irrelevant-source-selection");
		expect(() =>
			resolveMailboxSyncSources(
				connection({ provider: "microsoft-graph", labelIds: ["INBOX"] }),
			),
		).toThrow("provider-irrelevant-source-selection");
	});

	test("returns contention without opening the provider stream", async () => {
		const persistence = store({ kind: "contended" });
		const gmail = adapter("gmail", []);
		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).resolves.toEqual({ kind: "contended" });
		expect(gmail.listInputs).toHaveLength(0);
		expect(persistence.calls.settlements).toHaveLength(0);
	});

	test("validates the claimed lease and authority fences before provider access", async () => {
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({
				authorityFence: {
					...claimedLease().authorityFence,
					ownerUserId: 99,
				},
			}),
		});
		const gmail = adapter("gmail", []);
		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).rejects.toThrow("mailbox-sync-authority-scope-mismatch");
		expect(gmail.listInputs).toHaveLength(0);

		const expiredStore = store({
			kind: "claimed",
			lease: claimedLease({
				leaseFence: {
					leaseId: "lease-1",
					epoch: 7,
					expiresAt: new Date("2026-09-13T11:59:59.000Z"),
				},
			}),
		});
		await expect(
			runMailboxSyncStream(runInput, {
				store: expiredStore.api,
				adapters: { gmail: gmail.api },
			}),
		).rejects.toThrow("invalid-mailbox-sync-lease-fence");
	});

	test("fails closed and durably suppresses disabled policy", async () => {
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({ policy: policy({ enabled: false }) }),
		});
		const gmail = adapter("gmail", []);
		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).resolves.toEqual({ kind: "suppressed", reason: "policy-disabled" });
		expect(gmail.listInputs).toHaveLength(0);
		expect(persistence.calls.settlements).toEqual([
			{
				kind: "suppressed",
				value: expect.objectContaining({ reason: "policy-disabled" }),
			},
		]);
	});

	test("commits each source page and checkpoint atomically from a retention-bounded initial window", async () => {
		const persistence = store();
		const gmail = adapter("gmail", [
			{
				messages: [
					summary("accepted"),
					summary("ignored", { fromEmail: "blocked@example.com" }),
				],
				removedProviderMessageIds: ["deleted"],
				nextCursor: "cursor-2",
				cursorInvalid: false,
			},
		]);
		const lease = claimedLease({
			connection: connection({ excludedSenders: ["blocked@example.com"] }),
		});
		persistence.api.claimLease = async (input) => {
			persistence.calls.claims.push(input);
			return { kind: "claimed", lease };
		};

		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).resolves.toEqual({
			kind: "complete",
			pagesFetched: 1,
			messagesProjected: 1,
			messagesSuppressed: 1,
			tombstonesProjected: 1,
		});

		expect(gmail.listInputs).toEqual([
			expect.objectContaining({
				cursor: undefined,
				pageToken: undefined,
				labelId: "INBOX",
				folderId: undefined,
				since: new Date("2026-08-14T12:00:00.000Z"),
				fullSync: true,
				limit: 50,
				signal: expect.any(AbortSignal),
			}),
		]);
		expect(persistence.calls.commits).toHaveLength(1);
		expect(persistence.calls.commits[0]).toEqual(
			expect.objectContaining({
				leaseFence: lease.leaseFence,
				authorityFence: lease.authorityFence,
				expectedCheckpoint: null,
				nextCheckpoint: expect.objectContaining({
					cursor: "cursor-2",
					pageToken: null,
					mode: "incremental",
					since: new Date("2026-08-14T12:00:00.000Z"),
				}),
				summaries: [
					expect.objectContaining({
						summary: expect.objectContaining({ providerMessageId: "accepted" }),
						disposition: { accepted: true },
					}),
					expect.objectContaining({
						summary: expect.objectContaining({ providerMessageId: "ignored" }),
						disposition: {
							accepted: false,
							reason: "excluded-sender",
						},
					}),
				],
				tombstones: [
					{
						connectionId: "connection-1",
						provider: "gmail",
						sourceKey: "gmail:label:INBOX",
						providerMessageId: "deleted",
					},
				],
			}),
		);
		expect(persistence.calls.settlements).toEqual([
			{
				kind: "complete",
				value: expect.objectContaining({
					leaseFence: lease.leaseFence,
					authorityFence: lease.authorityFence,
				}),
			},
		]);
	});

	test("checkpoints a cursor reset before bounded full recovery", async () => {
		const checkpoint = {
			cursor: "expired",
			pageToken: null,
			mode: "incremental",
			since: new Date("2026-08-20T00:00:00.000Z"),
			retryAttempts: 0,
			cursorResets: 0,
			continuationFingerprints: [],
		} as const;
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({ checkpoint }),
		});
		const gmail = adapter("gmail", [
			new MailboxProviderError({ provider: "gmail", code: "cursor-invalid" }),
			{
				messages: [],
				removedProviderMessageIds: [],
				nextCursor: "recovered",
				cursorInvalid: false,
			},
		]);

		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).resolves.toMatchObject({ kind: "complete" });
		expect(persistence.calls.resets).toEqual([
			expect.objectContaining({
				expectedCheckpoint: checkpoint,
				nextCheckpoint: {
					cursor: null,
					pageToken: null,
					mode: "recovery-full",
					since: checkpoint.since,
					retryAttempts: 0,
					cursorResets: 1,
					continuationFingerprints: [],
				},
			}),
		]);
		expect(gmail.listInputs).toEqual([
			expect.objectContaining({ cursor: "expired", fullSync: false }),
			expect.objectContaining({
				cursor: undefined,
				pageToken: undefined,
				fullSync: true,
				since: checkpoint.since,
			}),
		]);
		expect(persistence.calls.commits[0]).toEqual(
			expect.objectContaining({
				expectedCheckpoint: expect.objectContaining({
					mode: "recovery-full",
				}),
				nextCheckpoint: expect.objectContaining({
					cursor: "recovered",
					mode: "incremental",
				}),
			}),
		);
	});

	test("lets a truncated initial full-sync continuation use its one cursor reset", async () => {
		const checkpoint = {
			cursor: null,
			pageToken: "initial-page",
			mode: "recovery-full",
			since: new Date("2026-08-20T00:00:00.000Z"),
			retryAttempts: 0,
			cursorResets: 0,
			continuationFingerprints: [
				"6aed1998fb47f0b6b0ad0b19ed840cc82a58fb046215e94d75a789eab1c93e70",
			],
		} as const;
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({ checkpoint }),
		});
		const gmail = adapter("gmail", [
			new MailboxProviderError({ provider: "gmail", code: "cursor-invalid" }),
			{
				messages: [],
				removedProviderMessageIds: [],
				nextCursor: "recovered",
				cursorInvalid: false,
			},
		]);

		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).resolves.toMatchObject({ kind: "complete" });
		expect(persistence.calls.resets[0]).toEqual(
			expect.objectContaining({
				nextCheckpoint: expect.objectContaining({
					cursorResets: 1,
					continuationFingerprints: [],
				}),
			}),
		);
	});

	test("clamps an older checkpoint window to the current retention policy", async () => {
		const checkpoint = {
			cursor: "current-cursor",
			pageToken: null,
			mode: "incremental",
			since: new Date("2026-01-01T00:00:00.000Z"),
			retryAttempts: 0,
			cursorResets: 0,
			continuationFingerprints: [],
		} as const;
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({
				checkpoint,
				policy: policy({ retentionDays: 7 }),
			}),
		});
		const gmail = adapter("gmail", [
			{
				messages: [],
				removedProviderMessageIds: [],
				nextCursor: "next-cursor",
				cursorInvalid: false,
			},
		]);

		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).resolves.toMatchObject({ kind: "complete" });
		expect(gmail.listInputs[0]?.since).toEqual(
			new Date("2026-09-06T12:00:00.000Z"),
		);
		expect(persistence.calls.commits[0]).toEqual(
			expect.objectContaining({
				expectedCheckpoint: checkpoint,
				nextCheckpoint: expect.objectContaining({
					since: new Date("2026-09-06T12:00:00.000Z"),
				}),
			}),
		);
	});

	test("rejects future windows and invalid durable reset or continuation evidence", async () => {
		for (const checkpoint of [
			{
				cursor: "c1",
				pageToken: null,
				mode: "incremental" as const,
				since: new Date("2026-09-13T12:00:00.001Z"),
				retryAttempts: 0,
				cursorResets: 0,
				continuationFingerprints: [],
			},
			{
				cursor: "c1",
				pageToken: null,
				mode: "incremental" as const,
				since: new Date("2026-09-01T00:00:00.000Z"),
				retryAttempts: 0,
				cursorResets: 2,
				continuationFingerprints: [],
			},
			{
				cursor: null,
				pageToken: "next",
				mode: "recovery-full" as const,
				since: new Date("2026-09-01T00:00:00.000Z"),
				retryAttempts: 0,
				cursorResets: 0,
				continuationFingerprints: ["not-a-sha256"],
			},
			{
				cursor: 42,
				pageToken: null,
				mode: "incremental",
				since: new Date("2026-09-01T00:00:00.000Z"),
				retryAttempts: 0,
				cursorResets: 0,
				continuationFingerprints: [],
			},
			{
				cursor: null,
				pageToken: null,
				mode: "unknown",
				since: new Date("2026-09-01T00:00:00.000Z"),
				retryAttempts: 0,
				cursorResets: 0,
				continuationFingerprints: [],
			},
		]) {
			const persistence = store({
				kind: "claimed",
				lease: claimedLease({ checkpoint: checkpoint as never }),
			});
			const gmail = adapter("gmail", []);
			await expect(
				runMailboxSyncStream(runInput, {
					store: persistence.api,
					adapters: { gmail: gmail.api },
				}),
			).rejects.toThrow("invalid-mailbox-sync-checkpoint");
			expect(gmail.listInputs).toHaveLength(0);
		}
	});

	test("settles a final page at the exact budget cap as complete", async () => {
		const persistence = store();
		const gmail = adapter("gmail", [
			{
				messages: [summary("m1")],
				removedProviderMessageIds: [],
				nextCursor: "current-cursor",
				cursorInvalid: false,
			},
		]);
		await expect(
			runMailboxSyncStream(
				{
					...runInput,
					budget: {
						...DEFAULT_MAILBOX_SYNC_BUDGET,
						maxMessages: 1,
					},
				},
				{ store: persistence.api, adapters: { gmail: gmail.api } },
			),
		).resolves.toMatchObject({ kind: "complete" });
		expect(persistence.calls.commits[0]).toEqual(
			expect.objectContaining({
				nextCheckpoint: expect.objectContaining({
					cursor: "current-cursor",
					mode: "incremental",
					pageToken: null,
				}),
			}),
		);
		expect(persistence.calls.settlements).toEqual([
			{ kind: "complete", value: expect.any(Object) },
		]);
	});

	test("settles truncated work as continuation-pending with its opaque page checkpoint", async () => {
		const persistence = store();
		const gmail = adapter("gmail", [
			{
				messages: [summary("m1")],
				removedProviderMessageIds: [],
				nextPageToken: "opaque-next",
				cursorInvalid: false,
			},
		]);
		await expect(
			runMailboxSyncStream(
				{
					...runInput,
					budget: {
						pageSize: 1,
						maxPages: 1,
						maxMessages: 1,
						maxCursorResets: 1,
						maxEmptyContinuationPages: 2,
						maxRetryAttempts: 5,
					},
				},
				{ store: persistence.api, adapters: { gmail: gmail.api } },
			),
		).resolves.toEqual({
			kind: "continuation-pending",
			pagesFetched: 1,
			messagesProjected: 1,
			messagesSuppressed: 0,
			tombstonesProjected: 0,
		});
		expect(persistence.calls.commits[0]).toEqual(
			expect.objectContaining({
				nextCheckpoint: expect.objectContaining({
					pageToken: "opaque-next",
				}),
			}),
		);
		expect(persistence.calls.settlements).toEqual([
			{ kind: "continuation", value: expect.any(Object) },
		]);
	});

	test("dead-letters an A-to-B-to-A continuation cycle across invocations", async () => {
		const hashA =
			"a1577d0964cd17cf8a8bddf3197a1fc360cf5f6c4d03984311134ed3fef4ce26";
		const hashB =
			"18657f6dbf143d10099a538f9eb68f124af72467b1503c979bfc1c2e968bdaad";
		const checkpointA = {
			cursor: null,
			pageToken: "A",
			mode: "recovery-full",
			since: new Date("2026-08-20T00:00:00.000Z"),
			retryAttempts: 0,
			cursorResets: 0,
			continuationFingerprints: [hashA],
		} as const;
		const firstStore = store({
			kind: "claimed",
			lease: claimedLease({ checkpoint: checkpointA }),
		});
		const gmailB = adapter("gmail", [
			{
				messages: [],
				removedProviderMessageIds: [],
				nextPageToken: "B",
				cursorInvalid: false,
			},
		]);
		const onePageBudget = {
			pageSize: 50,
			maxPages: 1,
			maxMessages: 500,
			maxCursorResets: 1,
			maxEmptyContinuationPages: 2,
			maxRetryAttempts: 5,
		} as const;
		await expect(
			runMailboxSyncStream(
				{ ...runInput, budget: onePageBudget },
				{ store: firstStore.api, adapters: { gmail: gmailB.api } },
			),
		).resolves.toMatchObject({ kind: "continuation-pending" });
		const continuedCheckpoint = (
			firstStore.calls.commits[0] as {
				nextCheckpoint: MailboxSyncStoreLease["checkpoint"];
			}
		).nextCheckpoint;
		expect(continuedCheckpoint).toEqual(
			expect.objectContaining({
				pageToken: "B",
				continuationFingerprints: [hashA, hashB],
			}),
		);

		const secondStore = store({
			kind: "claimed",
			lease: claimedLease({ checkpoint: continuedCheckpoint }),
		});
		const gmailA = adapter("gmail", [
			{
				messages: [],
				removedProviderMessageIds: [],
				nextPageToken: "A",
				cursorInvalid: false,
			},
		]);
		await expect(
			runMailboxSyncStream(
				{ ...runInput, runId: "run-2", budget: onePageBudget },
				{ store: secondStore.api, adapters: { gmail: gmailA.api } },
			),
		).resolves.toEqual({
			kind: "dead-lettered",
			reason: "continuation-loop",
		});
		expect(secondStore.calls.commits).toHaveLength(0);
	});

	test("stops cleanly when a mutation loses lease or authority fencing", async () => {
		for (const result of ["lease-lost", "authority-changed"] as const) {
			const persistence = store();
			persistence.api.commitPageAndCheckpoint = async (input) => {
				persistence.calls.commits.push(input);
				return { kind: result };
			};
			const gmail = adapter("gmail", [
				{
					messages: [],
					removedProviderMessageIds: [],
					nextCursor: "c2",
					cursorInvalid: false,
				},
			]);
			await expect(
				runMailboxSyncStream(runInput, {
					store: persistence.api,
					adapters: { gmail: gmail.api },
				}),
			).resolves.toEqual({ kind: result });
			expect(persistence.calls.settlements).toHaveLength(0);
		}
	});

	test("does not open another provider page after its lease expires", async () => {
		const persistence = store();
		const gmail = adapter("gmail", [
			{
				messages: [],
				removedProviderMessageIds: [],
				nextPageToken: "next",
				cursorInvalid: false,
			},
		]);
		const ticks = [
			new Date("2026-09-13T12:00:10.000Z"),
			new Date("2026-09-13T12:01:00.000Z"),
		];
		await expect(
			runMailboxSyncStream(
				{
					...runInput,
					clock: () => ticks.shift() ?? new Date("2026-09-13T12:01:00.000Z"),
				},
				{ store: persistence.api, adapters: { gmail: gmail.api } },
			),
		).resolves.toEqual({ kind: "lease-lost" });
		expect(gmail.listInputs).toHaveLength(1);
		expect(persistence.calls.commits).toHaveLength(0);
	});

	test("returns caller cancellation without retrying or settling provider work", async () => {
		const caller = new AbortController();
		const persistence = store();
		const gmail = adapter("gmail", []);
		gmail.api.listMessages = async () => new Promise<MailboxSyncPage>(() => {});
		const pending = runMailboxSyncStream(
			{ ...runInput, signal: caller.signal },
			{ store: persistence.api, adapters: { gmail: gmail.api } },
		);

		await new Promise((resolve) => setTimeout(resolve, 0));
		caller.abort("caller secret");

		await expect(pending).resolves.toEqual({ kind: "cancelled" });
		expect(persistence.calls.commits).toHaveLength(0);
		expect(persistence.calls.settlements).toHaveLength(0);
	});

	test("returns lease expiry before the reserved settlement window without opening the provider", async () => {
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({
				leaseFence: {
					...claimedLease().leaseFence,
					expiresAt: new Date("2026-09-13T12:00:00.250Z"),
				},
			}),
		});
		const gmail = adapter("gmail", []);

		await expect(
			runMailboxSyncStream(
				{
					...runInput,
					leaseDurationMs: 1_000,
				},
				{ store: persistence.api, adapters: { gmail: gmail.api } },
			),
		).resolves.toEqual({ kind: "lease-lost" });
		expect(gmail.listInputs).toHaveLength(0);
		expect(persistence.calls.commits).toHaveLength(0);
		expect(persistence.calls.settlements).toHaveLength(0);
	});

	test("keeps request-timeout evidence on the existing bounded retry path", async () => {
		const persistence = store();
		const gmail = adapter("gmail", [
			new MailboxProviderError({
				provider: "gmail",
				code: "network",
				requestFailure: "request-timeout",
			}),
		]);

		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).resolves.toEqual({ kind: "retry-pending", retryAfterMs: 5_000 });
		expect(persistence.calls.settlements).toEqual([
			{
				kind: "retry",
				value: expect.objectContaining({
					evidence: expect.objectContaining({
						code: "network",
						requestFailure: "request-timeout",
					}),
				}),
			},
		]);
	});

	test("durably settles retry, reauthorization, and exhausted work", async () => {
		const retryStore = store();
		const rateLimited = adapter("gmail", [
			new MailboxProviderError({
				provider: "gmail",
				code: "rate-limited",
				retryAfterMs: 12_000,
			}),
		]);
		await expect(
			runMailboxSyncStream(runInput, {
				store: retryStore.api,
				adapters: { gmail: rateLimited.api },
			}),
		).resolves.toEqual({ kind: "retry-pending", retryAfterMs: 12_000 });
		expect(retryStore.calls.settlements).toEqual([
			{
				kind: "retry",
				value: expect.objectContaining({
					retryAfterMs: 12_000,
					checkpoint: expect.objectContaining({ retryAttempts: 1 }),
					evidence: expect.objectContaining({ code: "rate-limited" }),
				}),
			},
		]);

		const reauthStore = store();
		const revoked = adapter("gmail", [
			new MailboxProviderError({
				provider: "gmail",
				code: "authorization-revoked",
			}),
		]);
		await expect(
			runMailboxSyncStream(runInput, {
				store: reauthStore.api,
				adapters: { gmail: revoked.api },
			}),
		).resolves.toEqual({ kind: "reauthorization-required" });
		expect(reauthStore.calls.settlements).toEqual([
			{
				kind: "reauthorization",
				value: expect.objectContaining({
					evidence: expect.objectContaining({
						code: "authorization-revoked",
						requiresReauthorization: true,
					}),
				}),
			},
		]);

		const deadStore = store({
			kind: "claimed",
			lease: claimedLease({
				checkpoint: {
					cursor: "cursor-1",
					pageToken: null,
					mode: "incremental",
					since: new Date("2026-08-20T00:00:00.000Z"),
					retryAttempts: 5,
					cursorResets: 0,
					continuationFingerprints: [],
				},
			}),
		});
		const unavailable = adapter("gmail", [
			new MailboxProviderError({ provider: "gmail", code: "network" }),
		]);
		await expect(
			runMailboxSyncStream(runInput, {
				store: deadStore.api,
				adapters: { gmail: unavailable.api },
			}),
		).resolves.toEqual({ kind: "dead-lettered", reason: "provider-error" });
		expect(deadStore.calls.settlements).toEqual([
			{
				kind: "dead-letter",
				value: expect.objectContaining({
					reason: "provider-error",
					evidence: expect.objectContaining({ code: "network" }),
				}),
			},
		]);
	});

	test("keeps tombstones scoped to their Gmail label or Graph folder stream", async () => {
		const gmailStore = store({
			kind: "claimed",
			lease: claimedLease({
				connection: connection({ labelIds: ["QUOTE"] }),
			}),
		});
		const gmail = adapter("gmail", [
			{
				messages: [],
				removedProviderMessageIds: ["same-provider-id"],
				nextCursor: "g2",
				cursorInvalid: false,
			},
		]);
		await runMailboxSyncStream(
			{
				...runInput,
				source: {
					kind: "gmail-label",
					labelId: "QUOTE",
					key: "gmail:label:QUOTE",
				},
			},
			{ store: gmailStore.api, adapters: { gmail: gmail.api } },
		);

		const graphSource = {
			kind: "graph-folder",
			folderId: "quotes",
			key: "graph:folder:quotes",
		} as const;
		const graphStore = store({
			kind: "claimed",
			lease: claimedLease({
				connection: connection({
					provider: "microsoft-graph",
					folderIds: ["quotes"],
				}),
				authorityFence: {
					...claimedLease().authorityFence,
					provider: "microsoft-graph",
				},
			}),
		});
		const graph = adapter("microsoft-graph", [
			{
				messages: [],
				removedProviderMessageIds: ["same-provider-id"],
				nextCursor: "https://graph.microsoft.com/v1.0/me/delta/c2",
				cursorInvalid: false,
			},
		]);
		await runMailboxSyncStream(
			{ ...runInput, source: graphSource },
			{
				store: graphStore.api,
				adapters: { "microsoft-graph": graph.api },
			},
		);

		expect(gmailStore.calls.commits[0]).toEqual(
			expect.objectContaining({
				tombstones: [
					expect.objectContaining({
						provider: "gmail",
						sourceKey: "gmail:label:QUOTE",
					}),
				],
			}),
		);
		expect(graph.listInputs[0]).toEqual(
			expect.objectContaining({ folderId: "quotes", labelId: undefined }),
		);
		expect(graphStore.calls.commits[0]).toEqual(
			expect.objectContaining({
				tombstones: [
					expect.objectContaining({
						provider: "microsoft-graph",
						sourceKey: "graph:folder:quotes",
					}),
				],
			}),
		);
	});

	test("replays a page after an ambiguous commit failure without inventing content identity", async () => {
		const persistence = store();
		const providerPage = {
			messages: [summary("m1")],
			removedProviderMessageIds: ["m0"],
			nextCursor: "c2",
			cursorInvalid: false,
		} satisfies MailboxSyncPage;
		const gmail = adapter("gmail", [providerPage, providerPage]);
		let commitAttempt = 0;
		persistence.api.commitPageAndCheckpoint = async (input) => {
			persistence.calls.commits.push(input);
			commitAttempt += 1;
			if (commitAttempt === 1) throw new Error("ambiguous-storage-failure");
			return { kind: "applied" };
		};

		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).rejects.toThrow("ambiguous-storage-failure");
		expect(persistence.calls.settlements).toHaveLength(0);
		await expect(
			runMailboxSyncStream(runInput, {
				store: persistence.api,
				adapters: { gmail: gmail.api },
			}),
		).resolves.toMatchObject({ kind: "complete" });
		expect(persistence.calls.commits).toHaveLength(2);
		expect(persistence.calls.commits[1]).toEqual(persistence.calls.commits[0]);
		const committed = persistence.calls.commits[1] as {
			summaries: Array<Record<string, unknown>>;
		};
		expect(Object.keys(committed)).not.toContain("contentHash");
		expect(Object.keys(committed)).not.toContain("queueIdentity");
		expect(Object.keys(committed.summaries[0] ?? {})).toEqual([
			"connectionId",
			"provider",
			"sourceKey",
			"summary",
			"disposition",
		]);
	});

	test("leaves unknown provider and storage failures to the outer runner", async () => {
		const providerStore = store();
		const brokenProvider = adapter("gmail", [
			new Error("unknown-provider-bug"),
		]);
		await expect(
			runMailboxSyncStream(runInput, {
				store: providerStore.api,
				adapters: { gmail: brokenProvider.api },
			}),
		).rejects.toThrow("unknown-provider-bug");
		expect(providerStore.calls.settlements).toHaveLength(0);

		const settlementStore = store();
		settlementStore.api.settleComplete = async () => {
			throw new Error("storage-unavailable");
		};
		const gmail = adapter("gmail", [
			{
				messages: [],
				removedProviderMessageIds: [],
				nextCursor: "c2",
				cursorInvalid: false,
			},
		]);
		await expect(
			runMailboxSyncStream(runInput, {
				store: settlementStore.api,
				adapters: { gmail: gmail.api },
			}),
		).rejects.toThrow("storage-unavailable");
	});

	test("suppresses an unconfigured provider source before any mailbox access", async () => {
		const persistence = store();
		const gmail = adapter("gmail", []);
		await expect(
			runMailboxSyncStream(
				{
					...runInput,
					source: {
						kind: "gmail-label",
						labelId: "SPAM",
						key: "gmail:label:SPAM",
					},
				},
				{ store: persistence.api, adapters: { gmail: gmail.api } },
			),
		).resolves.toEqual({
			kind: "suppressed",
			reason: "source-not-configured",
		});
		expect(gmail.listInputs).toHaveLength(0);
	});
});
