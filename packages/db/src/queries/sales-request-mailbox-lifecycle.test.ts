import { describe, expect, test } from "bun:test";
import { hashMailboxProviderAccountIdentity } from "./sales-request-mailbox-identities";
import { createSalesRequestMailboxLifecycleStores } from "./sales-request-mailbox-lifecycle";

describe("sales request mailbox lifecycle persistence", () => {
	const authorized = () => ({
		kind: "authorized" as const,
		authority: {
			ownerUserId: 7,
			employeeProfileId: 70,
			organizationId: 40,
			officeAuthorityKey: "office:40",
			authorityRevision: "authority-4",
			salesSettingsId: 1,
			salesSettingsRevision: 2,
			policy: {},
			policyRevision: 4,
			providerEligible: true,
		},
	});
	test("keeps owner and provider-account identity checks inside one transaction", async () => {
		const calls: string[] = [];
		let dbNow = new Date("2026-09-13T10:02:00.000Z");
		const connection = {
			id: "connection-1",
			organizationId: 40,
			ownerUserId: 7,
			provider: "gmail",
			providerAccountId: "User-ABC",
			providerAccountIdentityHash: hashMailboxProviderAccountIdentity(
				"gmail",
				"User-ABC",
			),
			revision: 3,
			state: "active",
			disconnectId: null as string | null,
			disconnectPhase: null as string | null,
			disconnectStartedAt: null as Date | null,
			disconnectCompletedAt: null as Date | null,
			disconnectedAt: null as Date | null,
			scopeFingerprint: `mcs1:${"a".repeat(64)}`,
		};
		const tx = {
			$queryRaw: async () => [{ now: dbNow }],
			salesRequestMailboxOAuthAttempt: {
				findUnique: async () => ({
					stateDigest: "state-digest",
					organizationId: 40,
					ownerUserId: 7,
					employeeProfileId: 70,
					officeAuthorityKey: "office:40",
					provider: "gmail",
					redirectKey: "dashboard-settings",
					issuedAt: new Date("2026-09-13T10:00:00.000Z"),
					expiresAt: new Date("2026-09-13T10:10:00.000Z"),
					salesSettingsId: 1,
					salesSettingsRevision: 2,
					policyRevision: 4,
					authorityRevision: "authority-4",
					consumedAt: new Date("2026-09-13T10:01:00.000Z"),
					terminalAt: null,
				}),
			},
			salesRequestMailboxConnection: {
				findFirst: async () => connection,
			},
		};
		const db = {
			async $transaction<T>(run: (client: typeof tx) => Promise<T>) {
				calls.push("transaction");
				return run(tx);
			},
		};
		const stores = createSalesRequestMailboxLifecycleStores(db as never, {
			resolveAuthority: async () => {
				calls.push("authority");
				return {
					kind: "authorized",
					authority: {
						ownerUserId: 7,
						employeeProfileId: 70,
						organizationId: 40,
						officeAuthorityKey: "office:40",
						authorityRevision: "authority-4",
						salesSettingsId: 1,
						salesSettingsRevision: 2,
						policy: {},
						policyRevision: 4,
						providerEligible: true,
					},
				};
			},
		});

		const prepareInput = {
			attempt: {
				stateDigest: "state-digest",
				organizationId: 40,
				ownerUserId: 7,
				employeeProfileId: 70,
				officeAuthorityKey: "office:40",
				provider: "gmail",
				redirectKey: "dashboard-settings",
				issuedAt: new Date("2026-09-13T10:00:00.000Z"),
				expiresAt: new Date("2026-09-13T10:10:00.000Z"),
				salesSettingsId: 1,
				salesSettingsRevision: 2,
				policyRevision: 4,
				authorityRevision: "authority-4",
				consumedAt: new Date("2026-09-13T10:01:00.000Z"),
			},
			candidateConnectionId: "5f25329d-59a6-4e38-92fd-6954ad1a4f5d",
			providerAccountId: "User-ABC",
			scopeFingerprint: `mcs1:${"b".repeat(64)}`,
			now: new Date("2026-09-13T10:02:00.000Z"),
		} as const;
		const result =
			await stores.connection.prepareConnectionTarget(prepareInput);

		expect(result).toEqual({
			kind: "prepared",
			target: {
				kind: "reconnect",
				connectionId: "connection-1",
				expectedConnectionRevision: 3,
				expectedScopeFingerprint: `mcs1:${"a".repeat(64)}`,
			},
		});
		expect(calls).toEqual(["transaction", "authority"]);
		dbNow = new Date("2026-09-13T10:11:00.000Z");
		expect(
			await stores.connection.prepareConnectionTarget(prepareInput),
		).toEqual({ kind: "attempt-invalid" });

		dbNow = new Date("2026-09-13T10:02:00.000Z");
		connection.state = "disconnecting";
		connection.disconnectId = "disconnect-work-1";
		expect(
			await stores.connection.prepareConnectionTarget(prepareInput),
		).toEqual({ kind: "identity-conflict" });
	});

	test("does not trust a case-insensitive database match", async () => {
		const tx = {
			$queryRaw: async () => [{ now: new Date("2026-09-13T10:02:00.000Z") }],
			salesRequestMailboxOAuthAttempt: {
				findUnique: async () => ({
					stateDigest: "state-digest",
					organizationId: 40,
					ownerUserId: 7,
					employeeProfileId: 70,
					officeAuthorityKey: "office:40",
					provider: "gmail",
					redirectKey: "dashboard-settings",
					issuedAt: new Date("2026-09-13T10:00:00.000Z"),
					expiresAt: new Date("2026-09-13T10:10:00.000Z"),
					salesSettingsId: 1,
					salesSettingsRevision: 2,
					policyRevision: 4,
					authorityRevision: "authority-4",
					consumedAt: new Date("2026-09-13T10:01:00.000Z"),
					terminalAt: null,
				}),
			},
			salesRequestMailboxConnection: {
				findFirst: async () => ({
					id: "connection-1",
					organizationId: 40,
					ownerUserId: 7,
					provider: "gmail",
					providerAccountId: "user-abc",
					providerAccountIdentityHash: hashMailboxProviderAccountIdentity(
						"gmail",
						"User-ABC",
					),
					revision: 3,
					state: "active",
					scopeFingerprint: `mcs1:${"a".repeat(64)}`,
				}),
			},
		};
		const stores = createSalesRequestMailboxLifecycleStores(
			{
				$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
			} as never,
			{
				resolveAuthority: async () => ({
					kind: "authorized",
					authority: {
						ownerUserId: 7,
						employeeProfileId: 70,
						organizationId: 40,
						officeAuthorityKey: "office:40",
						authorityRevision: "authority-4",
						salesSettingsId: 1,
						salesSettingsRevision: 2,
						policy: {},
						policyRevision: 4,
						providerEligible: true,
					},
				}),
			},
		);

		expect(
			await stores.connection.prepareConnectionTarget({
				attempt: {
					stateDigest: "state-digest",
					organizationId: 40,
					ownerUserId: 7,
					employeeProfileId: 70,
					officeAuthorityKey: "office:40",
					provider: "gmail",
					redirectKey: "dashboard-settings",
					issuedAt: new Date("2026-09-13T10:00:00.000Z"),
					expiresAt: new Date("2026-09-13T10:10:00.000Z"),
					salesSettingsId: 1,
					salesSettingsRevision: 2,
					policyRevision: 4,
					authorityRevision: "authority-4",
					consumedAt: new Date("2026-09-13T10:01:00.000Z"),
				},
				candidateConnectionId: "5f25329d-59a6-4e38-92fd-6954ad1a4f5d",
				providerAccountId: "User-ABC",
				scopeFingerprint: `mcs1:${"b".repeat(64)}`,
				now: new Date("2026-09-13T10:02:00.000Z"),
			}),
		).toEqual({ kind: "identity-conflict" });
	});

	test("creates the provider default Inbox source and durable sync stream with a new connection", async () => {
		const created: Array<{ table: string; data: Record<string, unknown> }> = [];
		const now = new Date("2026-09-13T10:02:00.000Z");
		const consumedAt = new Date("2026-09-13T10:01:00.000Z");
		const storedAttempt = {
			stateDigest: "state-digest",
			organizationId: 40,
			ownerUserId: 7,
			employeeProfileId: 70,
			officeAuthorityKey: "office:40",
			provider: "gmail",
			redirectKey: "dashboard-settings",
			issuedAt: new Date("2026-09-13T10:00:00.000Z"),
			expiresAt: new Date("2026-09-13T10:10:00.000Z"),
			salesSettingsId: 1,
			salesSettingsRevision: 2,
			policyRevision: 4,
			authorityRevision: "authority-4",
			consumedAt,
			terminalAt: null,
		};
		const tx = {
			$queryRaw: async () => [{ now }],
			salesRequestMailboxOAuthAttempt: {
				findUnique: async () => storedAttempt,
			},
			salesRequestMailboxConnection: {
				findFirst: async () => null,
				create: async ({ data }: { data: Record<string, unknown> }) => {
					created.push({ table: "connection", data });
				},
			},
			salesRequestMailboxSource: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					created.push({ table: "source", data });
				},
			},
			salesRequestMailboxSyncStream: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					created.push({ table: "stream", data });
				},
			},
		};
		const stores = createSalesRequestMailboxLifecycleStores(
			{
				$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
			} as never,
			{
				createSourceId: () => "source-1",
				createStreamId: () => "stream-work-1",
				resolveAuthority: async () => ({
					kind: "authorized",
					authority: {
						ownerUserId: 7,
						employeeProfileId: 70,
						organizationId: 40,
						officeAuthorityKey: "office:40",
						authorityRevision: "authority-4",
						salesSettingsId: 1,
						salesSettingsRevision: 2,
						policy: {},
						policyRevision: 4,
						providerEligible: true,
					},
				}),
			},
		);

		const result = await stores.connection.commitConnection({
			attempt: storedAttempt as never,
			target: {
				kind: "new",
				connectionId: "5f25329d-59a6-4e38-92fd-6954ad1a4f5d",
			},
			connection: {
				providerAccountId: "User-ABC",
				accountEmail: "user@example.com",
				displayName: null,
				grantedScopes: ["scope"],
				scopeFingerprint: `mcs1:${"a".repeat(64)}`,
				accessToken: {
					algorithm: "aes-256-gcm",
					keyVersion: "key-1",
					iv: "AAAA",
					authTag: "AAAA",
					ciphertext: "AAAA",
				},
				refreshToken: {
					algorithm: "aes-256-gcm",
					keyVersion: "key-1",
					iv: "AAAA",
					authTag: "AAAA",
					ciphertext: "AAAA",
				},
				tokenExpiresAt: new Date("2026-09-13T11:00:00.000Z"),
			},
			now,
			reconnectBehavior: {
				preserveOwner: true,
				preservePreferences: true,
				incrementRevision: true,
				resetCursor: true,
				resetSubscription: true,
				resetHealthForBoundedRecovery: true,
			},
		});

		expect(result).toEqual({
			kind: "committed",
			connectionId: "5f25329d-59a6-4e38-92fd-6954ad1a4f5d",
			connectionRevision: 1,
		});
		expect(created.map((entry) => entry.table)).toEqual([
			"connection",
			"source",
			"stream",
		]);
		expect(created[1]?.data).toMatchObject({
			id: "source-1",
			kind: "gmail-label",
			providerSourceId: "INBOX",
			sourceKey: "gmail:label:INBOX",
			selected: true,
		});
		expect(created[2]?.data).toMatchObject({
			id: "stream-work-1",
			sourceId: "source-1",
			status: "queued",
			nextAttemptAt: now,
		});
	});

	test("forced token health claims a durable fenced operation despite retry backoff", async () => {
		const now = new Date("2026-09-13T10:02:00.000Z");
		const dbNow = new Date("2026-09-13T10:04:00.000Z");
		let update: Record<string, unknown> | undefined;
		const envelope = {
			algorithm: "aes-256-gcm",
			keyVersion: "key-1",
			iv: "AAAA",
			authTag: "AAAA",
			ciphertext: "AAAA",
		};
		const record = {
			id: "connection-1",
			organizationId: 40,
			ownerUserId: 7,
			employeeProfileId: 70,
			officeAuthorityKey: "office:40",
			authorityRevision: "authority-4",
			salesSettingsId: 1,
			salesSettingsRevision: 2,
			policyRevision: 4,
			provider: "gmail",
			providerAccountId: "User-ABC",
			providerAccountIdentityHash: hashMailboxProviderAccountIdentity(
				"gmail",
				"User-ABC",
			),
			grantedScopes: ["scope"],
			scopeFingerprint: `mcs1:${"a".repeat(64)}`,
			accessTokenEnvelope: envelope,
			refreshTokenEnvelope: envelope,
			tokenExpiresAt: new Date("2026-09-13T11:00:00.000Z"),
			revision: 3,
			state: "active",
			healthOperationId: "previous-work",
			healthOperationConnectionRevision: 3,
			healthStatus: "temporarily-unavailable",
			healthLeaseId: null,
			healthLeaseEpoch: 2,
			healthLeaseExpiresAt: null,
			healthRetryAttempt: 1,
			healthNextAttemptAt: new Date("2026-09-13T10:10:00.000Z"),
		};
		const tx = {
			$queryRaw: async () => [{ now: dbNow }],
			salesRequestMailboxConnection: {
				findUnique: async () => record,
				updateMany: async ({ data }: { data: Record<string, unknown> }) => {
					update = data;
					return { count: 1 };
				},
			},
		};
		const stores = createSalesRequestMailboxLifecycleStores(
			{
				$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
			} as never,
			{
				createLeaseId: () => "lease-3",
				resolveAuthority: async () => ({
					kind: "authorized",
					authority: {
						ownerUserId: 7,
						employeeProfileId: 70,
						organizationId: 40,
						officeAuthorityKey: "office:40",
						authorityRevision: "authority-4",
						salesSettingsId: 1,
						salesSettingsRevision: 2,
						policy: {},
						policyRevision: 4,
						providerEligible: true,
					},
				}),
			},
		);

		const result = await stores.tokenHealth.claimTokenHealth({
			connectionId: "connection-1",
			expectedConnectionRevision: 3,
			operationId: "health-work-3",
			reason: "forced-health-check",
			now,
			leaseDurationMs: 120_000,
			refreshBeforeExpiryMs: 300_000,
			maxRetryAttempts: 5,
		});

		expect(result.kind).toBe("claimed");
		expect(update).toMatchObject({
			healthOperationId: "health-work-3",
			healthOperationConnectionRevision: 3,
			healthStatus: "claimed",
			healthLeaseId: "lease-3",
			healthLeaseEpoch: 3,
			healthLeaseExpiresAt: new Date("2026-09-13T10:06:00.000Z"),
		});
	});

	test("disconnect cleanup removes private child state before erasing credentials", async () => {
		const operations: string[] = [];
		const record = {
			id: "connection-1",
			disconnectId: "disconnect-work-1",
			disconnectPreviousRevision: 5,
			revision: 6,
			organizationId: 40,
			ownerUserId: 7,
			employeeProfileId: 70,
			officeAuthorityKey: "office:40",
			authorityRevision: "authority-4",
			state: "disconnecting",
			disconnectPhase: "cleanup",
		};
		const child = (table: string) => ({
			deleteMany: async () => {
				operations.push(table);
			},
		});
		let erased: Record<string, unknown> | undefined;
		const tx = {
			salesRequestMailboxConnection: {
				findUnique: async () => record,
				updateMany: async ({ data }: { data: Record<string, unknown> }) => {
					operations.push("connection");
					erased = data;
					return { count: 1 };
				},
			},
			salesRequestMailboxQueueProjection: child("queue"),
			salesRequestMailboxSourceMembership: child("membership"),
			salesRequestMailboxMessageSnapshot: child("snapshot"),
			salesRequestMailboxMessageLease: child("message-lease"),
			salesRequestMailboxMessageSummary: child("summary"),
			salesRequestMailboxSyncStream: child("sync-stream"),
			salesRequestMailboxSource: child("source"),
		};
		const stores = createSalesRequestMailboxLifecycleStores(
			{
				$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
			} as never,
			{
				resolveAuthority: async () => ({
					kind: "rejected",
					reason: "employee-inactive",
				}),
			},
		);

		expect(
			await stores.disconnect.completeDisconnect({
				disconnectId: "disconnect-work-1",
				connectionId: "connection-1",
				previousConnectionRevision: 5,
				connectionRevision: 6,
				organizationId: 40,
				ownerUserId: 7,
				employeeProfileId: 70,
				officeAuthorityKey: "office:40",
				authorityRevision: "authority-4",
				now: new Date("2026-09-13T10:03:00.000Z"),
				cleanupBehavior: {
					eraseCredentials: true,
					eraseProviderAccountIdentity: true,
					erasePrivateSyncState: true,
					purgeRetainedSourceContent: "immediately",
					retainAudit: "content-free-only",
				},
			}),
		).toEqual({ kind: "completed" });
		expect(operations).toEqual([
			"connection",
			"queue",
			"membership",
			"snapshot",
			"message-lease",
			"summary",
			"sync-stream",
			"source",
		]);
		expect(erased).toMatchObject({
			state: "disconnected",
			providerAccountId: null,
			providerAccountIdentityHash: null,
			accountEmail: null,
			accessTokenEnvelope: expect.anything(),
			refreshTokenEnvelope: expect.anything(),
			disconnectPhase: "completed",
		});
	});

	test("disconnect cleanup does not delete private state after a lost CAS", async () => {
		let childDeletes = 0;
		const child = {
			deleteMany: async () => {
				childDeletes += 1;
			},
		};
		const record = {
			id: "connection-1",
			disconnectId: "disconnect-work-1",
			disconnectPreviousRevision: 5,
			revision: 6,
			organizationId: 40,
			ownerUserId: 7,
			employeeProfileId: 70,
			officeAuthorityKey: "office:40",
			authorityRevision: "authority-4",
			state: "disconnecting",
			disconnectPhase: "cleanup",
		};
		const tx = {
			salesRequestMailboxConnection: {
				findUnique: async () => record,
				updateMany: async () => ({ count: 0 }),
			},
			salesRequestMailboxQueueProjection: child,
			salesRequestMailboxSourceMembership: child,
			salesRequestMailboxMessageSnapshot: child,
			salesRequestMailboxMessageLease: child,
			salesRequestMailboxMessageSummary: child,
			salesRequestMailboxSyncStream: child,
			salesRequestMailboxSource: child,
		};
		const stores = createSalesRequestMailboxLifecycleStores(
			{
				$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
			} as never,
			{
				resolveAuthority: async () => ({
					kind: "rejected",
					reason: "employee-inactive",
				}),
			},
		);

		expect(
			await stores.disconnect.completeDisconnect({
				disconnectId: "disconnect-work-1",
				connectionId: "connection-1",
				previousConnectionRevision: 5,
				connectionRevision: 6,
				organizationId: 40,
				ownerUserId: 7,
				employeeProfileId: 70,
				officeAuthorityKey: "office:40",
				authorityRevision: "authority-4",
				now: new Date("2026-09-13T10:03:00.000Z"),
				cleanupBehavior: {
					eraseCredentials: true,
					eraseProviderAccountIdentity: true,
					erasePrivateSyncState: true,
					purgeRetainedSourceContent: "immediately",
					retainAudit: "content-free-only",
				},
			}),
		).toEqual({ kind: "claim-lost" });
		expect(childDeletes).toBe(0);
	});

	test("OAuth consumption uses the database clock for expiry and persisted timestamps", async () => {
		const dbNow = new Date("2026-09-13T10:06:00.000Z");
		let update: Record<string, unknown> | undefined;
		const tx = {
			$queryRaw: async () => [{ now: dbNow }],
			salesRequestMailboxOAuthAttempt: {
				findUnique: async () => ({
					stateDigest: "state-digest",
					organizationId: 40,
					ownerUserId: 7,
					employeeProfileId: 70,
					officeAuthorityKey: "office:40",
					provider: "gmail",
					redirectKey: "dashboard-settings",
					issuedAt: new Date("2026-09-13T10:00:00.000Z"),
					expiresAt: new Date("2026-09-13T10:05:00.000Z"),
					salesSettingsId: 1,
					salesSettingsRevision: 2,
					policyRevision: 4,
					authorityRevision: "authority-4",
					consumedAt: null,
					terminalAt: null,
				}),
				updateMany: async ({ data }: { data: Record<string, unknown> }) => {
					update = data;
					return { count: 1 };
				},
			},
		};
		const stores = createSalesRequestMailboxLifecycleStores(
			{
				$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
			} as never,
			{ resolveAuthority: async () => authorized() },
		);

		expect(
			await stores.connection.consumeCallbackAttempt({
				stateDigest: "state-digest",
				actorUserId: 7,
				provider: "gmail",
				redirectKey: "dashboard-settings",
				callbackKind: "code",
				now: new Date("2026-09-13T10:01:00.000Z"),
			}),
		).toEqual({ kind: "terminal", reason: "expired" });
		expect(update).toMatchObject({
			consumedAt: dbNow,
			terminalAt: dbNow,
			terminalReason: "expired",
		});
	});

	test("resumes an exact durable disconnect cleanup after authority is lost", async () => {
		let authorityReads = 0;
		const tx = {
			salesRequestMailboxConnection: {
				findUnique: async () => ({
					id: "connection-1",
					organizationId: 40,
					ownerUserId: 7,
					employeeProfileId: 70,
					officeAuthorityKey: "office:40",
					authorityRevision: "authority-4",
					provider: "gmail",
					state: "disconnecting",
					disconnectId: "disconnect-work-1",
					disconnectPhase: "cleanup",
					disconnectPreviousRevision: 5,
					disconnectCompletedAt: null,
					revision: 6,
				}),
			},
		};
		const stores = createSalesRequestMailboxLifecycleStores(
			{
				$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
			} as never,
			{
				resolveAuthority: async () => {
					authorityReads += 1;
					return { kind: "rejected", reason: "employee-inactive" };
				},
			},
		);

		expect(
			await stores.disconnect.claimDisconnect({
				actorUserId: 7,
				connectionId: "connection-1",
				expectedConnectionRevision: 5,
				now: new Date("2026-09-13T10:07:00.000Z"),
				authorityBehavior: {
					requireActiveEmployee: true,
					requireActiveProfile: true,
					requireCanonicalActiveOffice: true,
					requireOwnerMatch: true,
					ignoreMailboxPolicy: true,
				},
				claimBehavior: {
					deactivateConnection: true,
					incrementConnectionRevision: true,
					invalidateSyncLeases: true,
					invalidateCursors: true,
					invalidateSubscriptions: true,
					blockNewReads: true,
					persistResumableDisconnect: true,
				},
			}),
		).toEqual({
			kind: "cleanup-required",
			claim: {
				disconnectId: "disconnect-work-1",
				connectionId: "connection-1",
				previousConnectionRevision: 5,
				connectionRevision: 6,
				organizationId: 40,
				ownerUserId: 7,
				employeeProfileId: 70,
				officeAuthorityKey: "office:40",
				authorityRevision: "authority-4",
			},
		});
		expect(authorityReads).toBe(0);
	});

	test("allows an owner to disconnect after mailbox policy changes", async () => {
		let connectionUpdate: Record<string, unknown> | undefined;
		const record = {
			id: "connection-1",
			organizationId: 40,
			ownerUserId: 7,
			employeeProfileId: 70,
			officeAuthorityKey: "office:40",
			authorityRevision: "authority-before-policy-change",
			salesSettingsId: 1,
			salesSettingsRevision: 2,
			policyRevision: 4,
			provider: "microsoft-graph",
			providerAccountId: "graph-account",
			providerAccountIdentityHash: hashMailboxProviderAccountIdentity(
				"microsoft-graph",
				"graph-account",
			),
			grantedScopes: ["scope"],
			accessTokenEnvelope: null,
			refreshTokenEnvelope: null,
			tokenExpiresAt: null,
			revision: 5,
			state: "active",
			disconnectId: null,
			disconnectPhase: null,
			disconnectPreviousRevision: null,
			disconnectCompletedAt: null,
		};
		const tx = {
			salesRequestMailboxConnection: {
				findUnique: async () => record,
				updateMany: async ({ data }: { data: Record<string, unknown> }) => {
					connectionUpdate = data;
					return { count: 1 };
				},
			},
			salesRequestMailboxSyncStream: {
				updateMany: async () => ({ count: 0 }),
			},
			salesRequestMailboxMessageLease: {
				updateMany: async () => ({ count: 0 }),
			},
		};
		const stores = createSalesRequestMailboxLifecycleStores(
			{
				$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
			} as never,
			{
				createDisconnectId: () => "disconnect-after-policy-change",
				resolveAuthority: async () => ({
					kind: "authorized",
					authority: {
						...authorized().authority,
						authorityRevision: "authority-after-policy-change",
						salesSettingsRevision: 3,
						policyRevision: 5,
						providerEligible: false,
					},
				}),
			},
		);

		const result = await stores.disconnect.claimDisconnect({
			actorUserId: 7,
			connectionId: record.id,
			expectedConnectionRevision: 5,
			now: new Date("2026-09-14T10:07:00.000Z"),
			authorityBehavior: {
				requireActiveEmployee: true,
				requireActiveProfile: true,
				requireCanonicalActiveOffice: true,
				requireOwnerMatch: true,
				ignoreMailboxPolicy: true,
			},
			claimBehavior: {
				deactivateConnection: true,
				incrementConnectionRevision: true,
				invalidateSyncLeases: true,
				invalidateCursors: true,
				invalidateSubscriptions: true,
				blockNewReads: true,
				persistResumableDisconnect: true,
			},
		});

		expect(result.kind).toBe("cleanup-required");
		expect(connectionUpdate).toMatchObject({
			state: "disconnecting",
			syncBlocked: true,
		});
	});

	test("keeps missing Gmail credentials in resumable provider revocation while Graph can clean up locally", async () => {
		for (const provider of ["gmail", "microsoft-graph"] as const) {
			let connectionUpdate: Record<string, unknown> | undefined;
			const providerAccountId = `${provider}-account`;
			const record = {
				id: `connection-${provider}`,
				organizationId: 40,
				ownerUserId: 7,
				employeeProfileId: 70,
				officeAuthorityKey: "office:40",
				authorityRevision: "authority-4",
				salesSettingsId: 1,
				salesSettingsRevision: 2,
				policyRevision: 4,
				provider,
				providerAccountId,
				providerAccountIdentityHash: hashMailboxProviderAccountIdentity(
					provider,
					providerAccountId,
				),
				grantedScopes: ["scope"],
				accessTokenEnvelope: null,
				refreshTokenEnvelope: null,
				tokenExpiresAt: null,
				revision: 5,
				state: "active",
				disconnectId: null,
				disconnectPhase: null,
				disconnectPreviousRevision: null,
				disconnectCompletedAt: null,
			};
			const tx = {
				salesRequestMailboxConnection: {
					findUnique: async () => record,
					updateMany: async ({ data }: { data: Record<string, unknown> }) => {
						connectionUpdate = data;
						return { count: 1 };
					},
				},
				salesRequestMailboxSyncStream: {
					updateMany: async () => ({ count: 0 }),
				},
				salesRequestMailboxMessageLease: {
					updateMany: async () => ({ count: 0 }),
				},
			};
			const stores = createSalesRequestMailboxLifecycleStores(
				{
					$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
				} as never,
				{
					createDisconnectId: () => `disconnect-${provider}`,
					resolveAuthority: async () => authorized(),
				},
			);

			const result = await stores.disconnect.claimDisconnect({
				actorUserId: 7,
				connectionId: record.id,
				expectedConnectionRevision: 5,
				now: new Date("2026-09-13T10:07:00.000Z"),
				authorityBehavior: {
					requireActiveEmployee: true,
					requireActiveProfile: true,
					requireCanonicalActiveOffice: true,
					requireOwnerMatch: true,
					ignoreMailboxPolicy: true,
				},
				claimBehavior: {
					deactivateConnection: true,
					incrementConnectionRevision: true,
					invalidateSyncLeases: true,
					invalidateCursors: true,
					invalidateSubscriptions: true,
					blockNewReads: true,
					persistResumableDisconnect: true,
				},
			});

			expect(result.kind).toBe(
				provider === "gmail"
					? "provider-revocation-required"
					: "cleanup-required",
			);
			expect(connectionUpdate?.disconnectPhase).toBe(
				provider === "gmail" ? "provider-revocation" : "cleanup",
			);
		}
	});

	test("reconnect makes interrupted detail work discoverable and resets its retry metadata", async () => {
		let dbNow = new Date("2026-09-13T10:02:00.000Z");
		const attempt = {
			stateDigest: "state-digest",
			organizationId: 40,
			ownerUserId: 7,
			employeeProfileId: 70,
			officeAuthorityKey: "office:40",
			provider: "gmail" as const,
			redirectKey: "dashboard-settings" as const,
			issuedAt: new Date("2026-09-13T10:00:00.000Z"),
			expiresAt: new Date("2026-09-13T10:10:00.000Z"),
			salesSettingsId: 1,
			salesSettingsRevision: 2,
			policyRevision: 4,
			authorityRevision: "authority-4",
			consumedAt: new Date("2026-09-13T10:01:00.000Z"),
		};
		const accountId = "User-ABC";
		let reconnectState = "active";
		let reconnectDisconnectId: string | null = null;
		let leaseReset: Record<string, unknown> | undefined;
		let summaryReset: Record<string, unknown> | undefined;
		const tx = {
			$queryRaw: async () => [{ now: dbNow }],
			salesRequestMailboxOAuthAttempt: {
				findUnique: async () => ({ ...attempt, terminalAt: null }),
			},
			salesRequestMailboxConnection: {
				findFirst: async () => ({
					id: "connection-1",
					organizationId: 40,
					ownerUserId: 7,
					provider: "gmail",
					providerAccountId: accountId,
					providerAccountIdentityHash: hashMailboxProviderAccountIdentity(
						"gmail",
						accountId,
					),
					revision: 3,
					state: reconnectState,
					scopeFingerprint: `mcs1:${"a".repeat(64)}`,
					disconnectId: reconnectDisconnectId,
					disconnectPhase: null,
					disconnectStartedAt: null,
					disconnectCompletedAt: null,
					disconnectedAt: null,
				}),
				updateMany: async () => ({ count: 1 }),
			},
			salesRequestMailboxSyncStream: {
				updateMany: async () => ({ count: 1 }),
			},
			salesRequestMailboxMessageLease: {
				findMany: async () => [{ claimedSummaryId: "summary-1" }],
				updateMany: async ({ data }: { data: Record<string, unknown> }) => {
					leaseReset = data;
					return { count: 1 };
				},
			},
			salesRequestMailboxMessageSummary: {
				updateMany: async ({ data }: { data: Record<string, unknown> }) => {
					summaryReset = data;
					return { count: 1 };
				},
			},
		};
		const stores = createSalesRequestMailboxLifecycleStores(
			{
				$transaction: <T>(run: (client: typeof tx) => Promise<T>) => run(tx),
			} as never,
			{ resolveAuthority: async () => authorized() },
		);
		const envelope = {
			algorithm: "aes-256-gcm" as const,
			keyVersion: "key-1",
			iv: "AAAA",
			authTag: "AAAA",
			ciphertext: "AAAA",
		};
		const reconnectInput = {
			attempt,
			target: {
				kind: "reconnect" as const,
				connectionId: "connection-1",
				expectedConnectionRevision: 3,
				expectedScopeFingerprint: `mcs1:${"a".repeat(64)}`,
			},
			connection: {
				providerAccountId: accountId,
				accountEmail: "user@example.com",
				displayName: null,
				grantedScopes: ["scope"],
				scopeFingerprint: `mcs1:${"a".repeat(64)}`,
				accessToken: envelope,
				refreshToken: envelope,
				tokenExpiresAt: new Date("2026-09-13T11:00:00.000Z"),
			},
			now: new Date("2026-09-13T10:00:30.000Z"),
			reconnectBehavior: {
				preserveOwner: true,
				preservePreferences: true,
				incrementRevision: true,
				resetCursor: true,
				resetSubscription: true,
				resetHealthForBoundedRecovery: true,
			},
		};

		expect(await stores.connection.commitConnection(reconnectInput)).toEqual({
			kind: "committed",
			connectionId: "connection-1",
			connectionRevision: 4,
		});
		expect(leaseReset).toMatchObject({
			status: "queued",
			retryAttempts: 0,
			nextAttemptAt: dbNow,
			claimedSummaryId: null,
			claimedSummaryRevision: null,
		});
		expect(summaryReset).toEqual({ detailStatus: "queued" });

		dbNow = new Date("2026-09-13T10:11:00.000Z");
		expect(await stores.connection.commitConnection(reconnectInput)).toEqual({
			kind: "attempt-invalid",
		});

		dbNow = new Date("2026-09-13T10:02:00.000Z");
		reconnectState = "disconnecting";
		reconnectDisconnectId = "disconnect-work-1";
		expect(await stores.connection.commitConnection(reconnectInput)).toEqual({
			kind: "identity-conflict",
		});
	});
});
