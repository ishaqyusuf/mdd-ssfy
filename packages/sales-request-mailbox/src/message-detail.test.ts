import { describe, expect, test } from "bun:test";
import type {
	MailboxConnectionConfiguration,
	MailboxMessageDetail,
	MailboxMessageDetailStore,
	MailboxMessageDetailStoreLease,
	MailboxMessageSummary,
	MailboxSyncSource,
	SalesRequestMailboxAdapter,
	SalesRequestMailboxPolicy,
} from "./index";
import {
	MailboxProviderError,
	buildMailboxSourceMembershipIdentity,
	runMailboxMessageDetail,
} from "./index";

const now = new Date("2026-09-13T12:00:00.000Z");
const gmailInbox = {
	kind: "gmail-label",
	labelId: "INBOX",
	key: "gmail:label:INBOX",
} as const satisfies MailboxSyncSource;
const gmailStarred = {
	kind: "gmail-label",
	labelId: "STARRED",
	key: "gmail:label:STARRED",
} as const satisfies MailboxSyncSource;
const graphInbox = {
	kind: "graph-folder",
	folderId: "inbox",
	key: "graph:folder:inbox",
} as const satisfies MailboxSyncSource;

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
		revision: 4,
		changedAt: "2026-09-13T10:00:00.000Z",
		...overrides,
	};
}

function summary(
	overrides: Partial<MailboxMessageSummary> = {},
): MailboxMessageSummary {
	return {
		providerMessageId: "message-1",
		providerThreadId: "thread-1",
		labelIds: ["INBOX"],
		fromEmail: "customer@example.com",
		fromName: "Customer",
		subject: "Door quote",
		receivedAt: new Date("2026-09-12T10:00:00.000Z"),
		hasAttachments: true,
		headers: {},
		...overrides,
	};
}

function detail(
	overrides: Partial<MailboxMessageDetail> = {},
): MailboxMessageDetail {
	return {
		...summary(),
		textBody: "Need two solid-core doors.",
		toEmails: ["REP@EXAMPLE.COM", "rep@example.com"],
		ccEmails: ["Estimator@Example.com"],
		...overrides,
	};
}

function claimedLease(
	overrides: Partial<MailboxMessageDetailStoreLease> = {},
): MailboxMessageDetailStoreLease {
	return {
		leaseScope: {
			kind: "connection-provider-message",
			connectionId: "connection-1",
			providerMessageId: "message-1",
		},
		connectionId: "connection-1",
		source: gmailInbox,
		providerMessageId: "message-1",
		summaryRevision: 8,
		leaseFence: {
			leaseId: "detail-lease-1",
			epoch: 2,
			expiresAt: new Date("2026-09-13T12:01:00.000Z"),
		},
		authorityFence: {
			organizationId: 10,
			ownerUserId: 20,
			provider: "gmail",
			connectionRevision: 3,
			policyRevision: 4,
			ownerActive: true,
			connectionActive: true,
		},
		connection: connection(),
		policy: policy(),
		tokens: { accessToken: "provider-secret", grantedScopes: ["mail.read"] },
		summary: summary(),
		retryAttempts: 0,
		...overrides,
	};
}

function provider(
	outcomes: Array<MailboxMessageDetail | Error>,
	providerName: "gmail" | "microsoft-graph" = "gmail",
) {
	const calls = {
		getMessage: [] as unknown[],
		otherOperations: 0,
	};
	const forbidden = async () => {
		calls.otherOperations += 1;
		throw new Error("forbidden-provider-operation");
	};
	const api = {
		provider: providerName,
		createAuthorizationUrl: forbidden,
		exchangeAuthorizationCode: forbidden,
		refreshTokens: forbidden,
		revoke: forbidden,
		listMessages: forbidden,
		async getMessage(input) {
			calls.getMessage.push(input);
			const outcome = outcomes.shift();
			if (!outcome) throw new Error("missing-detail-outcome");
			if (outcome instanceof Error) throw outcome;
			return outcome;
		},
	} satisfies SalesRequestMailboxAdapter;
	return { api, calls };
}

function store(
	claim:
		| { kind: "contended" | "not-found" | "stale-summary" }
		| { kind: "claimed"; lease: MailboxMessageDetailStoreLease } = {
		kind: "claimed",
		lease: claimedLease(),
	},
) {
	const calls = {
		claims: [] as unknown[],
		commits: [] as unknown[],
		withdrawals: [] as unknown[],
		retries: [] as unknown[],
		reauthorizations: [] as unknown[],
		deadLetters: [] as unknown[],
	};
	const applied = { kind: "applied" } as const;
	const api: MailboxMessageDetailStore = {
		async claimLease(input) {
			calls.claims.push(input);
			return claim;
		},
		async commitSnapshotAndQueue(input) {
			calls.commits.push(input);
			return applied;
		},
		async withdrawCurrentProjection(input) {
			calls.withdrawals.push(input);
			return applied;
		},
		async settleRetry(input) {
			calls.retries.push(input);
			return applied;
		},
		async settleReauthorization(input) {
			calls.reauthorizations.push(input);
			return applied;
		},
		async settleDeadLetter(input) {
			calls.deadLetters.push(input);
			return applied;
		},
	};
	return { api, calls };
}

const runInput = {
	runId: "detail-run-1",
	connectionId: "connection-1",
	source: gmailInbox,
	providerMessageId: "message-1",
	expectedSummaryRevision: 8,
	now,
	leaseDurationMs: 60_000,
	clock: () => new Date("2026-09-13T12:00:10.000Z"),
} as const;

describe("mailbox message detail projection", () => {
	test("commits one bounded sanitized snapshot and current queue projection", async () => {
		const persistence = store();
		const mailbox = provider([
			detail({
				textBody: undefined,
				htmlBody:
					'<p>Need <strong>two</strong> doors.</p><script>steal()</script><img src="https://tracker.example/pixel">',
			}),
		]);

		await expect(
			runMailboxMessageDetail(runInput, {
				store: persistence.api,
				adapters: { gmail: mailbox.api },
			}),
		).resolves.toMatchObject({
			kind: "projected",
			sourceSummaryRevision: 8,
			contentHash: expect.stringMatching(/^msc1:[0-9a-f]{64}$/),
			queueIdentity: expect.stringMatching(/^srq1:[0-9a-f]{64}$/),
		});

		expect(mailbox.calls.getMessage).toEqual([
			{
				tokens: claimedLease().tokens,
				providerMessageId: "message-1",
				signal: expect.any(AbortSignal),
			},
		]);
		expect(mailbox.calls.otherOperations).toBe(0);
		expect(persistence.calls.claims[0]).toMatchObject({
			leaseScope: {
				kind: "connection-provider-message",
				connectionId: "connection-1",
				providerMessageId: "message-1",
			},
			sourceMembership: {
				source: gmailInbox,
				expectedSummaryRevision: 8,
			},
		});
		expect(persistence.calls.commits).toHaveLength(1);
		const commit = persistence.calls.commits[0] as Record<string, unknown> & {
			snapshot: Record<string, unknown>;
			queueProjection: Record<string, unknown>;
		};
		expect(commit).toMatchObject({
			connectionId: "connection-1",
			source: gmailInbox,
			providerMessageId: "message-1",
			expectedSummaryRevision: 8,
			retentionFence: { policyRevision: 4, retentionDays: 30 },
			snapshot: {
				schemaVersion: 1,
				provider: "gmail",
				providerMessageId: "message-1",
				providerThreadId: "thread-1",
				sourceSummaryRevision: 8,
				capturedAt: new Date("2026-09-13T12:00:10.000Z"),
				receivedAt: new Date("2026-09-12T10:00:00.000Z"),
				expiresAt: new Date("2026-10-12T10:00:00.000Z"),
				fromEmail: "customer@example.com",
				fromName: "Customer",
				subject: "Door quote",
				toEmails: ["rep@example.com"],
				ccEmails: ["estimator@example.com"],
				hasAttachments: true,
				displayText: "Need two doors.",
				modelInput: expect.stringContaining('"Need two doors."'),
			},
			queueProjection: {
				initialStatus: "new",
				sameIdentityBehavior: "preserve-status",
				contentChangeBehavior: "supersede-current-under-global-message-lease",
				sourceRevisionBehavior: "ignore-older-source-revision",
				sourceMembershipIdentity: buildMailboxSourceMembershipIdentity({
					connectionId: "connection-1",
					sourceKey: gmailInbox.key,
					providerMessageId: "message-1",
					summaryRevision: 8,
				}),
			},
			sourceMembership: {
				sourceKey: gmailInbox.key,
				summaryRevision: 8,
				state: "active",
				revisionBehavior: "ignore-older-source-revision",
			},
		});
		const stored = JSON.stringify(commit);
		expect(stored).not.toContain("provider-secret");
		expect(stored).not.toContain("tracker.example");
		expect(stored).not.toContain("htmlBody");
		expect(stored).not.toContain("attachments");
		expect(stored).not.toContain("steal()");
	});

	test("returns contention, missing work, and stale work without provider access", async () => {
		for (const kind of ["contended", "not-found", "stale-summary"] as const) {
			const persistence = store({ kind });
			const mailbox = provider([]);
			await expect(
				runMailboxMessageDetail(runInput, {
					store: persistence.api,
					adapters: { gmail: mailbox.api },
				}),
			).resolves.toEqual({ kind });
			expect(mailbox.calls.getMessage).toHaveLength(0);
		}
	});

	test("validates exact lease, authority, source, message, and summary revision bindings", async () => {
		for (const [lease, error] of [
			[
				claimedLease({ connectionId: "other" }),
				"mailbox-detail-lease-scope-mismatch",
			],
			[
				claimedLease({
					source: {
						kind: "gmail-label",
						labelId: "OTHER",
						key: "gmail:label:OTHER",
					},
				}),
				"mailbox-detail-lease-scope-mismatch",
			],
			[
				claimedLease({ providerMessageId: "other" }),
				"mailbox-detail-lease-scope-mismatch",
			],
			[
				claimedLease({ summaryRevision: 9 }),
				"mailbox-detail-summary-revision-mismatch",
			],
			[
				claimedLease({ summary: summary({ providerMessageId: "other" }) }),
				"mailbox-detail-summary-identity-mismatch",
			],
			[
				claimedLease({ summary: summary({ labelIds: ["OTHER"] }) }),
				"mailbox-detail-summary-source-mismatch",
			],
			[
				claimedLease({
					authorityFence: {
						...claimedLease().authorityFence,
						ownerUserId: 99,
					},
				}),
				"mailbox-detail-authority-scope-mismatch",
			],
		] as const) {
			const persistence = store({ kind: "claimed", lease });
			const mailbox = provider([]);
			await expect(
				runMailboxMessageDetail(runInput, {
					store: persistence.api,
					adapters: { gmail: mailbox.api },
				}),
			).rejects.toThrow(error);
			expect(mailbox.calls.getMessage).toHaveLength(0);
			expect(persistence.calls.withdrawals).toHaveLength(0);
		}
	});

	test("stops on an invalid or expired lease and on expiry after provider access", async () => {
		const invalidLease = store({
			kind: "claimed",
			lease: claimedLease({
				leaseFence: {
					leaseId: "detail-lease-1",
					epoch: 2,
					expiresAt: new Date("2026-09-13T11:59:59.000Z"),
				},
			}),
		});
		await expect(
			runMailboxMessageDetail(runInput, {
				store: invalidLease.api,
				adapters: { gmail: provider([]).api },
			}),
		).rejects.toThrow("invalid-mailbox-detail-lease-fence");

		const afterFetch = store();
		const mailbox = provider([detail()]);
		let tick = 0;
		await expect(
			runMailboxMessageDetail(
				{
					...runInput,
					clock: () =>
						++tick === 1
							? new Date("2026-09-13T12:00:10.000Z")
							: new Date("2026-09-13T12:01:00.000Z"),
				},
				{ store: afterFetch.api, adapters: { gmail: mailbox.api } },
			),
		).resolves.toEqual({ kind: "lease-lost" });
		expect(mailbox.calls.getMessage).toHaveLength(1);
		expect(afterFetch.calls.commits).toHaveLength(0);
	});

	test("returns caller cancellation without retrying or writing detail", async () => {
		const caller = new AbortController();
		const persistence = store();
		const mailbox = provider([detail()]);
		mailbox.api.getMessage = async () =>
			new Promise<MailboxMessageDetail>(() => {});
		const pending = runMailboxMessageDetail(
			{ ...runInput, signal: caller.signal },
			{ store: persistence.api, adapters: { gmail: mailbox.api } },
		);

		await new Promise((resolve) => setTimeout(resolve, 0));
		caller.abort("caller secret");

		await expect(pending).resolves.toEqual({ kind: "cancelled" });
		expect(persistence.calls.commits).toHaveLength(0);
		expect(persistence.calls.withdrawals).toHaveLength(0);
		expect(persistence.calls.retries).toHaveLength(0);
		expect(persistence.calls.deadLetters).toHaveLength(0);
	});

	test("returns lease expiry before the reserved detail-fetch window without writing", async () => {
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({
				leaseFence: {
					...claimedLease().leaseFence,
					expiresAt: new Date("2026-09-13T12:00:00.250Z"),
				},
			}),
		});
		const mailbox = provider([]);

		await expect(
			runMailboxMessageDetail(
				{ ...runInput, leaseDurationMs: 1_000 },
				{ store: persistence.api, adapters: { gmail: mailbox.api } },
			),
		).resolves.toEqual({ kind: "lease-lost" });
		expect(mailbox.calls.getMessage).toHaveLength(0);
		expect(persistence.calls.commits).toHaveLength(0);
		expect(persistence.calls.withdrawals).toHaveLength(0);
	});

	test("withdraws expired summaries before provider access using the earlier receipt anchor", async () => {
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({
				summary: summary({
					receivedAt: new Date("2026-08-14T11:59:59.000Z"),
				}),
			}),
		});
		const mailbox = provider([]);
		await expect(
			runMailboxMessageDetail(runInput, {
				store: persistence.api,
				adapters: { gmail: mailbox.api },
			}),
		).resolves.toEqual({ kind: "suppressed", reason: "retention-expired" });
		expect(mailbox.calls.getMessage).toHaveLength(0);
		expect(persistence.calls.withdrawals[0]).toMatchObject({
			connectionId: "connection-1",
			source: gmailInbox,
			providerMessageId: "message-1",
			expectedSummaryRevision: 8,
			reason: "retention-expired",
		});
	});

	test("anchors future provider timestamps to capture time", async () => {
		const future = new Date("2026-10-01T00:00:00.000Z");
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({ summary: summary({ receivedAt: future }) }),
		});
		const mailbox = provider([detail({ receivedAt: future })]);
		await runMailboxMessageDetail(runInput, {
			store: persistence.api,
			adapters: { gmail: mailbox.api },
		});
		expect(persistence.calls.commits[0]).toMatchObject({
			snapshot: {
				capturedAt: new Date("2026-09-13T12:00:10.000Z"),
				expiresAt: new Date("2026-10-13T12:00:10.000Z"),
			},
		});
	});

	test("does not fetch detail after the fresh pre-provider retention check expires", async () => {
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({ policy: policy({ retentionDays: 1 }) }),
		});
		const mailbox = provider([detail()]);
		const beforeExpiry = new Date("2026-09-13T11:59:59.000Z");
		const expiredAtProviderStart = new Date("2026-09-13T12:00:01.000Z");

		await expect(
			runMailboxMessageDetail(
				{
					...runInput,
					now: beforeExpiry,
					leaseDurationMs: 61_000,
					clock: () => expiredAtProviderStart,
				},
				{
					store: persistence.api,
					adapters: { gmail: mailbox.api },
				},
			),
		).resolves.toEqual({ kind: "suppressed", reason: "retention-expired" });
		expect(mailbox.calls.getMessage).toHaveLength(0);
		expect(persistence.calls.withdrawals).toHaveLength(1);
	});

	test("recomputes retention from the fresh post-fetch capture time", async () => {
		const persistence = store({
			kind: "claimed",
			lease: claimedLease({
				policy: policy({ retentionDays: 1 }),
				summary: summary({
					receivedAt: new Date("2026-09-12T12:00:00.000Z"),
				}),
			}),
		});
		const mailbox = provider([
			detail({
				receivedAt: new Date("2026-09-12T12:00:00.000Z"),
			}),
		]);
		const beforeExpiry = new Date("2026-09-13T11:59:59.000Z");
		const capturedAfterExpiry = new Date("2026-09-13T12:00:01.000Z");
		let clockCalls = 0;

		await expect(
			runMailboxMessageDetail(
				{
					...runInput,
					now: beforeExpiry,
					leaseDurationMs: 61_000,
					clock: () =>
						++clockCalls === 1 ? beforeExpiry : capturedAfterExpiry,
				},
				{
					store: persistence.api,
					adapters: { gmail: mailbox.api },
				},
			),
		).resolves.toEqual({ kind: "suppressed", reason: "retention-expired" });
		expect(mailbox.calls.getMessage).toHaveLength(1);
		expect(persistence.calls.commits).toHaveLength(0);
		expect(persistence.calls.withdrawals).toHaveLength(1);
	});

	test("re-runs deterministic exclusions on detail and withdraws exact work", async () => {
		const persistence = store();
		const mailbox = provider([
			detail({
				fromEmail: "rep@example.com",
				headers: { autoSubmitted: "auto-generated" },
			}),
		]);
		await expect(
			runMailboxMessageDetail(runInput, {
				store: persistence.api,
				adapters: { gmail: mailbox.api },
			}),
		).resolves.toEqual({ kind: "suppressed", reason: "mailbox-loop" });
		expect(persistence.calls.withdrawals[0]).toMatchObject({
			connectionId: "connection-1",
			source: gmailInbox,
			providerMessageId: "message-1",
			expectedSummaryRevision: 8,
			reason: "mailbox-loop",
		});

		const moved = store();
		await expect(
			runMailboxMessageDetail(runInput, {
				store: moved.api,
				adapters: {
					gmail: provider([detail({ labelIds: ["ARCHIVE"] })]).api,
				},
			}),
		).resolves.toEqual({
			kind: "suppressed",
			reason: "folder-not-selected",
		});
	});

	test("withdraws summary exclusions before fetching message body", async () => {
		for (const item of [
			{
				connection: connection({ excludedSenders: ["blocked@example.com"] }),
				summary: summary({ fromEmail: "blocked@example.com" }),
				reason: "excluded-sender",
			},
			{
				connection: connection({ excludedDomains: ["blocked.example"] }),
				summary: summary({ fromEmail: "buyer@blocked.example" }),
				reason: "excluded-domain",
			},
			{
				connection: connection(),
				summary: summary({ headers: { autoSubmitted: "auto-generated" } }),
				reason: "automatic-message",
			},
			{
				connection: connection(),
				summary: summary({ fromEmail: "rep@example.com" }),
				reason: "mailbox-loop",
			},
		] as const) {
			const persistence = store({
				kind: "claimed",
				lease: claimedLease({
					connection: item.connection,
					summary: item.summary,
				}),
			});
			const mailbox = provider([]);
			await expect(
				runMailboxMessageDetail(runInput, {
					store: persistence.api,
					adapters: { gmail: mailbox.api },
				}),
			).resolves.toEqual({ kind: "suppressed", reason: item.reason });
			expect(mailbox.calls.getMessage).toHaveLength(0);
			expect(persistence.calls.withdrawals[0]).toMatchObject({
				reason: item.reason,
				membershipWithdrawalBehavior:
					"deactivate-source-revision-ignore-if-stale",
				queueWithdrawalBehavior:
					"withdraw-global-if-no-active-selected-memberships",
			});
		}
	});

	test("accepts Graph default inbox alias and withdraws when opaque parent folder moves", async () => {
		const graphConnection = connection({
			provider: "microsoft-graph",
			folderIds: [],
			labelIds: [],
		});
		const graphSummary = summary({
			folderId: "opaque-inbox-folder-id",
			labelIds: [],
		});
		const graphLease = claimedLease({
			source: graphInbox,
			connection: graphConnection,
			summary: graphSummary,
			authorityFence: {
				...claimedLease().authorityFence,
				provider: "microsoft-graph",
			},
		});
		const projected = store({ kind: "claimed", lease: graphLease });
		await expect(
			runMailboxMessageDetail(
				{ ...runInput, source: graphInbox },
				{
					store: projected.api,
					adapters: {
						"microsoft-graph": provider(
							[
								detail({
									folderId: "opaque-inbox-folder-id",
									labelIds: [],
								}),
							],
							"microsoft-graph",
						).api,
					},
				},
			),
		).resolves.toMatchObject({ kind: "projected" });

		const moved = store({ kind: "claimed", lease: graphLease });
		await expect(
			runMailboxMessageDetail(
				{ ...runInput, source: graphInbox },
				{
					store: moved.api,
					adapters: {
						"microsoft-graph": provider(
							[detail({ folderId: "opaque-archive-id", labelIds: [] })],
							"microsoft-graph",
						).api,
					},
				},
			),
		).resolves.toEqual({
			kind: "suppressed",
			reason: "folder-not-selected",
		});

		const explicitFolder = {
			kind: "graph-folder",
			folderId: "configured-folder",
			key: "graph:folder:configured-folder",
		} as const satisfies MailboxSyncSource;
		const mismatchedSummary = store({
			kind: "claimed",
			lease: claimedLease({
				source: explicitFolder,
				connection: connection({
					provider: "microsoft-graph",
					folderIds: ["configured-folder"],
					labelIds: [],
				}),
				summary: summary({ folderId: "other-folder", labelIds: [] }),
				authorityFence: {
					...claimedLease().authorityFence,
					provider: "microsoft-graph",
				},
			}),
		});
		await expect(
			runMailboxMessageDetail(
				{ ...runInput, source: explicitFolder },
				{
					store: mismatchedSummary.api,
					adapters: { "microsoft-graph": provider([], "microsoft-graph").api },
				},
			),
		).rejects.toThrow("mailbox-detail-summary-source-mismatch");
	});

	test("dead-letters mismatched provider message and thread identities", async () => {
		for (const value of [
			detail({ providerMessageId: "other" }),
			detail({ providerThreadId: "other-thread" }),
			detail({ providerThreadId: undefined }),
		]) {
			const persistence = store();
			await expect(
				runMailboxMessageDetail(runInput, {
					store: persistence.api,
					adapters: { gmail: provider([value]).api },
				}),
			).resolves.toMatchObject({ kind: "dead-lettered" });
			expect(persistence.calls.deadLetters[0]).toMatchObject({
				reason: "malformed-response",
				evidence: { code: "malformed-response", provider: "gmail" },
			});
		}
	});

	test("makes replay identity deterministic and expresses globally leased content supersession", async () => {
		async function project(value: MailboxMessageDetail, capturedAt: Date) {
			const persistence = store({
				kind: "claimed",
				lease: claimedLease({
					summary: summary({ labelIds: value.labelIds }),
					leaseFence: {
						...claimedLease().leaseFence,
						expiresAt: new Date(capturedAt.getTime() + 60_000),
					},
				}),
			});
			const result = await runMailboxMessageDetail(
				{
					...runInput,
					now: capturedAt,
					clock: () => new Date(capturedAt.getTime() + 10_000),
				},
				{ store: persistence.api, adapters: { gmail: provider([value]).api } },
			);
			return { result, commit: persistence.calls.commits[0] };
		}

		const first = await project(detail(), now);
		const replay = await project(
			detail({ labelIds: ["INBOX", "STARRED"] }),
			new Date("2026-09-13T12:30:00.000Z"),
		);
		const changed = await project(
			detail({ textBody: "Need three solid-core doors." }),
			now,
		);
		expect(replay.result).toMatchObject({
			contentHash: (first.result as { contentHash: string }).contentHash,
			queueIdentity: (first.result as { queueIdentity: string }).queueIdentity,
		});
		expect(changed.result).not.toMatchObject({
			contentHash: (first.result as { contentHash: string }).contentHash,
			queueIdentity: (first.result as { queueIdentity: string }).queueIdentity,
		});
		expect(first.commit).toMatchObject({
			queueProjection: {
				sameIdentityBehavior: "preserve-status",
				contentChangeBehavior: "supersede-current-under-global-message-lease",
				sourceRevisionBehavior: "ignore-older-source-revision",
			},
		});
	});

	test("keeps two source memberships on one global queue identity without comparing their revisions", async () => {
		async function projectMembership(
			source: MailboxSyncSource,
			summaryRevision: number,
		) {
			const value = store({
				kind: "claimed",
				lease: claimedLease({
					source,
					summaryRevision,
					connection: connection({ labelIds: ["INBOX", "STARRED"] }),
					summary: summary({ labelIds: ["INBOX", "STARRED"] }),
				}),
			});
			const result = await runMailboxMessageDetail(
				{ ...runInput, source, expectedSummaryRevision: summaryRevision },
				{
					store: value.api,
					adapters: {
						gmail: provider([detail({ labelIds: ["INBOX", "STARRED"] })]).api,
					},
				},
			);
			return {
				result,
				commit: value.calls.commits[0],
				claim: value.calls.claims[0],
			};
		}
		const inbox = await projectMembership(gmailInbox, 8);
		const starred = await projectMembership(gmailStarred, 2);
		expect(starred.result).toMatchObject({
			queueIdentity: (inbox.result as { queueIdentity: string }).queueIdentity,
		});
		expect(starred.commit).toMatchObject({
			sourceMembership: {
				summaryRevision: 2,
				revisionBehavior: "ignore-older-source-revision",
			},
		});
		expect(starred.commit).not.toMatchObject({
			sourceMembership: (inbox.commit as { sourceMembership: unknown })
				.sourceMembership,
		});
		expect(starred.claim).toMatchObject({
			leaseScope: (inbox.claim as { leaseScope: unknown }).leaseScope,
		});

		const stale = store({ kind: "stale-summary" });
		await expect(
			runMailboxMessageDetail(
				{ ...runInput, source: gmailStarred, expectedSummaryRevision: 1 },
				{ store: stale.api, adapters: { gmail: provider([]).api } },
			),
		).resolves.toEqual({ kind: "stale-summary" });
		expect(stale.calls.commits).toHaveLength(0);
	});

	test("withdrawal deactivates only one source membership and preserves another active membership", async () => {
		const value = store({
			kind: "claimed",
			lease: claimedLease({
				connection: connection({ labelIds: ["INBOX", "STARRED"] }),
				summary: summary({ labelIds: ["INBOX", "STARRED"] }),
			}),
		});
		await runMailboxMessageDetail(runInput, {
			store: value.api,
			adapters: {
				gmail: provider([detail({ labelIds: ["STARRED"] })]).api,
			},
		});
		expect(value.calls.withdrawals[0]).toMatchObject({
			sourceMembershipIdentity: buildMailboxSourceMembershipIdentity({
				connectionId: "connection-1",
				sourceKey: gmailInbox.key,
				providerMessageId: "message-1",
				summaryRevision: 8,
			}),
			membershipWithdrawalBehavior:
				"deactivate-source-revision-ignore-if-stale",
			queueWithdrawalBehavior:
				"withdraw-global-if-no-active-selected-memberships",
		});
	});

	test("maps provider failures to withdrawal, retry, reauthorization, and dead letter", async () => {
		const cases = [
			{
				error: new MailboxProviderError({
					provider: "gmail",
					code: "not-found",
				}),
				result: { kind: "withdrawn", reason: "provider-not-found" },
				call: "withdrawals",
			},
			{
				error: new MailboxProviderError({ provider: "gmail", code: "network" }),
				result: { kind: "retry-pending", retryAfterMs: 5_000 },
				call: "retries",
			},
			{
				error: new MailboxProviderError({
					provider: "gmail",
					code: "authorization-revoked",
				}),
				result: { kind: "reauthorization-required" },
				call: "reauthorizations",
			},
			...(
				["malformed-response", "account-mismatch", "cursor-invalid"] as const
			).map((code) => ({
				error: new MailboxProviderError({ provider: "gmail", code }),
				result: { kind: "dead-lettered" as const, reason: code },
				call: "deadLetters" as const,
			})),
		] as const;
		for (const item of cases) {
			const persistence = store();
			await expect(
				runMailboxMessageDetail(runInput, {
					store: persistence.api,
					adapters: { gmail: provider([item.error]).api },
				}),
			).resolves.toEqual(item.result);
			expect(
				persistence.calls[
					item.call as
						| "withdrawals"
						| "retries"
						| "reauthorizations"
						| "deadLetters"
				],
			).toHaveLength(1);
		}

		const exhausted = store({
			kind: "claimed",
			lease: claimedLease({ retryAttempts: 5 }),
		});
		await expect(
			runMailboxMessageDetail(runInput, {
				store: exhausted.api,
				adapters: {
					gmail: provider([
						new MailboxProviderError({ provider: "gmail", code: "network" }),
					]).api,
				},
			}),
		).resolves.toEqual({ kind: "dead-lettered", reason: "retry-exhausted" });
	});

	test("keeps detail request-timeout evidence on the existing retry path", async () => {
		const persistence = store();
		await expect(
			runMailboxMessageDetail(runInput, {
				store: persistence.api,
				adapters: {
					gmail: provider([
						new MailboxProviderError({
							provider: "gmail",
							code: "network",
							requestFailure: "request-timeout",
						}),
					]).api,
				},
			}),
		).resolves.toEqual({ kind: "retry-pending", retryAfterMs: 5_000 });
		expect(persistence.calls.retries[0]).toMatchObject({
			evidence: {
				code: "network",
				requestFailure: "request-timeout",
			},
		});
	});

	test("propagates unknown provider and storage failures", async () => {
		await expect(
			runMailboxMessageDetail(runInput, {
				store: store().api,
				adapters: { gmail: provider([new Error("unknown-provider-bug")]).api },
			}),
		).rejects.toThrow("unknown-provider-bug");

		const persistence = store();
		persistence.api.commitSnapshotAndQueue = async () => {
			throw new Error("storage-down");
		};
		await expect(
			runMailboxMessageDetail(runInput, {
				store: persistence.api,
				adapters: { gmail: provider([detail()]).api },
			}),
		).rejects.toThrow("storage-down");
	});

	test("returns lease and authority fence outcomes from every durable mutation", async () => {
		for (const kind of ["lease-lost", "authority-changed"] as const) {
			const persistence = store();
			persistence.api.commitSnapshotAndQueue = async () => ({ kind });
			await expect(
				runMailboxMessageDetail(runInput, {
					store: persistence.api,
					adapters: { gmail: provider([detail()]).api },
				}),
			).resolves.toEqual({ kind });
		}
	});
});
