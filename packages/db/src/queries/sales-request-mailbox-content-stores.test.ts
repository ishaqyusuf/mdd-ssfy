import { describe, expect, test } from "bun:test";
import { encryptMailboxSecret } from "@gnd/sales-request-mailbox";
import {
	createPrismaSalesRequestMailboxRetentionStore,
	createPrismaSalesRequestMailboxSyncStore,
} from "./sales-request-mailbox-content-stores";
import {
	hashMailboxProviderAccountIdentity,
	hashMailboxProviderMessageIdentity,
	hashMailboxProviderSourceIdentity,
	hashMailboxSourceKey,
} from "./sales-request-mailbox-identities";

const key = Buffer.alloc(32, 4);

describe("Prisma sales-request mailbox sync store", () => {
	test("claims only the exact selected source under the database clock and returns decrypted tokens", async () => {
		const dbNow = new Date("2026-09-13T10:00:00.000Z");
		const source = {
			id: "source-1",
			connectionId: "connection-1",
			kind: "gmail-label",
			providerSourceId: "INBOX",
			providerSourceIdentityHash: hashMailboxProviderSourceIdentity(
				"gmail-label",
				"INBOX",
			),
			sourceKey: "gmail:label:INBOX",
			sourceKeyIdentityHash: hashMailboxSourceKey("gmail:label:INBOX"),
			selected: true,
		};
		const connection = {
			id: "connection-1",
			organizationId: 40,
			ownerUserId: 9,
			employeeProfileId: 8,
			officeAuthorityKey: "office-40",
			authorityRevision: "authority-3",
			salesSettingsId: 2,
			salesSettingsRevision: 5,
			policyRevision: 3,
			provider: "gmail",
			providerAccountId: "Provider/Account",
			providerAccountIdentityHash: hashMailboxProviderAccountIdentity(
				"gmail",
				"Provider/Account",
			),
			accountEmail: "owner@example.com",
			displayName: null,
			grantedScopes: ["gmail.readonly"],
			accessTokenEnvelope: encryptMailboxSecret({
				plaintext: "access-secret",
				key,
				keyVersion: "v1",
				binding: "connection-1:access-token",
			}),
			refreshTokenEnvelope: null,
			tokenExpiresAt: null,
			revision: 4,
			state: "active",
			automationMode: "manual",
			notifyOnNeedsReview: false,
			excludedSenders: [],
			excludedDomains: [],
			syncBlocked: false,
		};
		const stream = {
			id: "stream-1",
			connectionId: connection.id,
			sourceId: source.id,
			leaseEpoch: 2,
			leaseExpiresAt: null,
			status: "queued",
			nextAttemptAt: dbNow,
			checkpointMode: null,
			checkpointCursor: null,
			checkpointPageToken: null,
			checkpointSince: null,
			checkpointRetryAttempts: 0,
			checkpointCursorResets: 0,
			continuationFingerprints: null,
		};
		let rawCalls = 0;
		let claimedExpiry: Date | undefined;
		const tx = {
			$queryRaw: async () => {
				rawCalls += 1;
				return rawCalls === 1 ? [{ dbNow }] : [];
			},
			salesRequestMailboxSource: {
				findFirst: async () => source,
				findMany: async () => [source],
			},
			salesRequestMailboxSyncStream: {
				findFirst: async () => stream,
				updateMany: async (args: { data: { leaseExpiresAt: Date } }) => {
					claimedExpiry = args.data.leaseExpiresAt;
					return { count: 1 };
				},
			},
			salesRequestMailboxConnection: { findUnique: async () => connection },
		};
		const db = {
			$transaction: async (callback: (transaction: typeof tx) => unknown) =>
				callback(tx),
		};
		const store = createPrismaSalesRequestMailboxSyncStore(db as never, {
			keyRing: { resolve: () => key },
			resolveAuthority: async () => ({
				current: true,
				ownerActive: true,
				policy: {
					enabled: true,
					supportedProviders: ["gmail"],
					eligibleUserIds: [9],
					retentionDays: 30,
					maximumAutomationMode: "manual",
					emergencyDisabled: false,
					allowAttachments: false,
					maxAttachmentBytes: 0,
					revision: 3,
					changedAt: null,
				},
			}),
		});

		const result = await store.claimLease({
			runId: "run-1",
			connectionId: connection.id,
			source: {
				kind: "gmail-label",
				labelId: "INBOX",
				key: "gmail:label:INBOX",
			},
			now: new Date("2026-09-13T08:00:00.000Z"),
			leaseExpiresAt: new Date("2026-09-13T08:02:00.000Z"),
		});

		expect(result.kind).toBe("claimed");
		if (result.kind !== "claimed") throw new Error("expected claimed");
		expect(result.lease.tokens.accessToken).toBe("access-secret");
		expect(result.lease.leaseFence.epoch).toBe(3);
		expect(result.lease.connection).toMatchObject({ labelIds: ["INBOX"] });
		expect(claimedExpiry).toEqual(new Date("2026-09-13T10:02:00.000Z"));
	});
});

describe("Prisma sales-request mailbox retention store", () => {
	test("keeps message children when an exact retained snapshot remains", async () => {
		const providerMessageId = "Case/Sensitive-Retained";
		const identityHash = hashMailboxProviderMessageIdentity(
			"gmail",
			providerMessageId,
		);
		const deletedChildIds: unknown[] = [];
		const tx = {
			$queryRaw: async () => [
				{
					id: "expired-snapshot",
					connectionId: "connection-1",
					provider: "gmail",
					providerMessageId,
					providerMessageIdentityHash: identityHash,
					dbNow: new Date("2026-09-13T10:00:00.000Z"),
				},
			],
			salesRequestMailboxQueueProjection: {
				deleteMany: async (args: unknown) => {
					deletedChildIds.push(args);
					return { count: 0 };
				},
			},
			salesRequestMailboxSourceMembership: {
				deleteMany: async () => ({ count: 0 }),
			},
			salesRequestMailboxMessageLease: {
				deleteMany: async () => ({ count: 0 }),
			},
			salesRequestMailboxMessageSummary: {
				deleteMany: async () => ({ count: 0 }),
			},
			salesRequestMailboxMessageSnapshot: {
				findMany: async () => [
					{
						provider: "gmail",
						providerMessageId,
						providerMessageIdentityHash: identityHash,
					},
				],
				deleteMany: async () => ({ count: 1 }),
			},
			salesRequestMailboxOAuthAttempt: {
				findMany: async () => [],
				deleteMany: async () => ({ count: 0 }),
			},
		};
		const db = {
			$transaction: async (callback: (transaction: typeof tx) => unknown) =>
				callback(tx),
		};

		const result = await createPrismaSalesRequestMailboxRetentionStore(
			db as never,
		).purgeExpiredMailboxData({ limit: 20, behavior: {} });

		expect(deletedChildIds).toEqual([{ where: { id: { in: [] } } }]);
		expect(result.counts.snapshots).toBe(1);
		expect(result.counts.queueRows).toBe(0);
	});

	test("purges a bounded locked snapshot batch in child-to-parent order", async () => {
		const operations: string[] = [];
		const providerMessageId = "Case/Sensitive-Message";
		const identityHash = hashMailboxProviderMessageIdentity(
			"gmail",
			providerMessageId,
		);
		const tx = {
			$queryRaw: async () => [
				{
					id: "snapshot-1",
					connectionId: "connection-1",
					provider: "gmail",
					providerMessageId,
					providerMessageIdentityHash: identityHash,
					dbNow: new Date("2026-09-13T10:00:00.000Z"),
				},
			],
			salesRequestMailboxQueueProjection: {
				findMany: async () => [
					{ id: "queue-1", provider: "gmail", providerMessageId },
				],
				deleteMany: async () => {
					operations.push("queue");
					return { count: 1 };
				},
			},
			salesRequestMailboxSourceMembership: {
				findMany: async () => [{ id: "membership-1", providerMessageId }],
				deleteMany: async () => {
					operations.push("membership");
					return { count: 1 };
				},
			},
			salesRequestMailboxMessageLease: {
				findMany: async () => [{ id: "lease-1", providerMessageId }],
				deleteMany: async () => {
					operations.push("lease");
					return { count: 1 };
				},
			},
			salesRequestMailboxMessageSummary: {
				findMany: async () => [
					{ id: "summary-1", provider: "gmail", providerMessageId },
				],
				deleteMany: async () => {
					operations.push("summary");
					return { count: 1 };
				},
			},
			salesRequestMailboxMessageSnapshot: {
				findMany: async () => [],
				deleteMany: async () => {
					operations.push("snapshot");
					return { count: 1 };
				},
			},
			salesRequestMailboxOAuthAttempt: {
				findMany: async () => [{ stateDigest: "state-1" }],
				deleteMany: async () => {
					operations.push("oauth");
					return { count: 1 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (transaction: typeof tx) => unknown) =>
				callback(tx),
		};
		const store = createPrismaSalesRequestMailboxRetentionStore(db as never);

		const result = await store.purgeExpiredMailboxData({
			limit: 20,
			behavior: {
				clock: "database-current-time-only",
				snapshotSelection: "expired-snapshots-at-database-time",
				oauthAttemptSelection:
					"terminal-or-expired-for-24-hours-at-database-time",
				replay: "never-extend-existing-snapshot-expiry",
				transactionOrder: [
					"delete-current-queue-if-no-retained-snapshot",
					"delete-source-memberships-if-no-retained-snapshot",
					"delete-message-leases-if-no-retained-snapshot",
					"delete-message-summaries-if-no-retained-snapshot",
					"delete-selected-expired-snapshots",
					"delete-selected-terminal-or-expired-oauth-attempts",
				],
				preserveContentFreeConnectionAudit: true,
			},
		});

		expect(operations).toEqual([
			"queue",
			"membership",
			"lease",
			"summary",
			"snapshot",
			"oauth",
		]);
		expect(result).toEqual({
			counts: {
				queueRows: 1,
				memberships: 1,
				leases: 1,
				summaries: 1,
				snapshots: 1,
				oauthAttempts: 1,
			},
			hasMore: false,
		});
	});
});
