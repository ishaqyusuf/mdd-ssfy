import { randomUUID } from "node:crypto";
import type {
	MailboxConnectionAuthoritySnapshot,
	MailboxConnectionConsumedAttempt,
	MailboxConnectionLifecycleStore,
	MailboxDisconnectClaim,
	MailboxDisconnectCleanupClaim,
	MailboxDisconnectStore,
	MailboxProvider,
	MailboxTokenHealthClaim,
	MailboxTokenHealthStore,
} from "@gnd/sales-request-mailbox";
import {
	mailboxEncryptedSecretSchema,
	mailboxProviderSchema,
} from "@gnd/sales-request-mailbox";
import type { Database, TransactionClient } from "../index";
import { Prisma } from "../index";
import {
	hashMailboxProviderAccountIdentity,
	hashMailboxProviderSourceIdentity,
	hashMailboxSourceKey,
	isExactMailboxProviderIdentity,
} from "./sales-request-mailbox-identities";

const TRANSACTION_OPTIONS = {
	isolationLevel: "Serializable" as const,
	timeout: 10_000,
};

const UNAVAILABLE_DISCONNECT_SECRET = {
	algorithm: "aes-256-gcm",
	keyVersion: "__credentials-unavailable__",
	iv: "AAAAAAAAAAAAAAAA",
	authTag: "AAAAAAAAAAAAAAAAAAAAAA==",
	ciphertext: "AA==",
} as const;

type AuthorityPurpose = "connect" | "token-health" | "disconnect";

export type SalesRequestMailboxPersistenceAuthority =
	MailboxConnectionAuthoritySnapshot & { policyRevision: number };

export type ResolveSalesRequestMailboxPersistenceAuthority = (
	tx: TransactionClient,
	input: {
		actorUserId: number;
		provider: MailboxProvider;
		now: Date;
		purpose: AuthorityPurpose;
	},
) => Promise<
	| { kind: "authorized"; authority: SalesRequestMailboxPersistenceAuthority }
	| {
			kind: "rejected";
			reason:
				| "employee-inactive"
				| "profile-inactive"
				| "office-unavailable"
				| "settings-unavailable";
	  }
>;

export type SalesRequestMailboxLifecycleStoreOptions = {
	resolveAuthority: ResolveSalesRequestMailboxPersistenceAuthority;
	createLeaseId?: () => string;
	createDisconnectId?: () => string;
	createSourceId?: () => string;
	createStreamId?: () => string;
};

function defaultSource(provider: MailboxProvider) {
	return provider === "gmail"
		? {
				kind: "gmail-label",
				providerSourceId: "INBOX",
				sourceKey: "gmail:label:INBOX",
			}
		: {
				kind: "graph-folder",
				providerSourceId: "inbox",
				sourceKey: "graph:folder:inbox",
			};
}

function sameAuthority(
	stored: {
		organizationId: number;
		ownerUserId: number;
		employeeProfileId: number;
		officeAuthorityKey: string;
		authorityRevision: string;
		salesSettingsId: number;
		salesSettingsRevision: number;
		policyRevision: number;
	},
	current: SalesRequestMailboxPersistenceAuthority,
) {
	return (
		stored.organizationId === current.organizationId &&
		stored.ownerUserId === current.ownerUserId &&
		stored.employeeProfileId === current.employeeProfileId &&
		stored.officeAuthorityKey === current.officeAuthorityKey &&
		stored.authorityRevision === current.authorityRevision &&
		stored.salesSettingsId === current.salesSettingsId &&
		stored.salesSettingsRevision === current.salesSettingsRevision &&
		stored.policyRevision === current.policyRevision
	);
}

function exactProviderAccount(
	record: {
		provider: string;
		providerAccountId: string | null;
		providerAccountIdentityHash: string | null;
	},
	provider: MailboxProvider,
	providerAccountId: string,
) {
	return (
		record.provider === provider &&
		record.providerAccountIdentityHash ===
			hashMailboxProviderAccountIdentity(provider, providerAccountId) &&
		record.providerAccountId !== null &&
		isExactMailboxProviderIdentity(record.providerAccountId, providerAccountId)
	);
}

function reconnectableConnection(record: {
	state: string;
	disconnectId: string | null;
	disconnectPhase: string | null;
	disconnectStartedAt: Date | null;
	disconnectCompletedAt: Date | null;
	disconnectedAt: Date | null;
}) {
	return (
		record.state === "active" &&
		record.disconnectId === null &&
		record.disconnectPhase === null &&
		record.disconnectStartedAt === null &&
		record.disconnectCompletedAt === null &&
		record.disconnectedAt === null
	);
}

function parseProvider(value: string) {
	return mailboxProviderSchema.safeParse(value).success
		? (value as MailboxProvider)
		: null;
}

function parseScopes(value: unknown) {
	return Array.isArray(value) &&
		value.every((scope) => typeof scope === "string")
		? value
		: null;
}

function parseEnvelope(value: unknown) {
	const parsed = mailboxEncryptedSecretSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}

function attemptRecord(record: {
	stateDigest: string;
	organizationId: number;
	ownerUserId: number;
	employeeProfileId: number;
	officeAuthorityKey: string;
	provider: string;
	redirectKey: string;
	issuedAt: Date;
	expiresAt: Date;
	salesSettingsId: number;
	salesSettingsRevision: number;
	policyRevision: number;
	authorityRevision: string;
	consumedAt: Date | null;
}): MailboxConnectionConsumedAttempt | null {
	const provider = parseProvider(record.provider);
	if (!provider || !record.consumedAt) return null;
	return {
		stateDigest: record.stateDigest,
		organizationId: record.organizationId,
		ownerUserId: record.ownerUserId,
		employeeProfileId: record.employeeProfileId,
		officeAuthorityKey: record.officeAuthorityKey,
		provider,
		redirectKey:
			record.redirectKey as MailboxConnectionConsumedAttempt["redirectKey"],
		issuedAt: record.issuedAt,
		expiresAt: record.expiresAt,
		salesSettingsId: record.salesSettingsId,
		salesSettingsRevision: record.salesSettingsRevision,
		policyRevision: record.policyRevision,
		authorityRevision: record.authorityRevision,
		consumedAt: record.consumedAt,
	};
}

function sameConsumedAttempt(
	stored: Parameters<typeof attemptRecord>[0],
	expected: MailboxConnectionConsumedAttempt,
) {
	return (
		stored.stateDigest === expected.stateDigest &&
		stored.organizationId === expected.organizationId &&
		stored.ownerUserId === expected.ownerUserId &&
		stored.employeeProfileId === expected.employeeProfileId &&
		stored.officeAuthorityKey === expected.officeAuthorityKey &&
		stored.provider === expected.provider &&
		stored.redirectKey === expected.redirectKey &&
		stored.issuedAt.getTime() === expected.issuedAt.getTime() &&
		stored.expiresAt.getTime() === expected.expiresAt.getTime() &&
		stored.salesSettingsId === expected.salesSettingsId &&
		stored.salesSettingsRevision === expected.salesSettingsRevision &&
		stored.policyRevision === expected.policyRevision &&
		stored.authorityRevision === expected.authorityRevision &&
		stored.consumedAt?.getTime() === expected.consumedAt.getTime()
	);
}

async function currentAuthority(
	tx: TransactionClient,
	options: SalesRequestMailboxLifecycleStoreOptions,
	input: {
		actorUserId: number;
		provider: MailboxProvider;
		now: Date;
		purpose: AuthorityPurpose;
	},
) {
	return options.resolveAuthority(tx, input);
}

async function databaseNow(tx: TransactionClient) {
	const rows = await tx.$queryRaw<Array<{ now: Date }>>(
		Prisma.sql`SELECT CURRENT_TIMESTAMP(3) AS now`,
	);
	const now = rows[0]?.now;
	if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
		throw new Error("invalid-mailbox-database-clock");
	}
	return now;
}

function createConnectionStore(
	db: Database,
	options: SalesRequestMailboxLifecycleStoreOptions,
): MailboxConnectionLifecycleStore {
	return {
		async resolveStartAuthority(input) {
			const result = await db.$transaction(
				(tx) =>
					currentAuthority(tx, options, {
						...input,
						purpose: "connect",
					}),
				TRANSACTION_OPTIONS,
			);
			return result.kind === "authorized"
				? { kind: "authorized", authority: result.authority }
				: result;
		},

		async createAttempt(input) {
			return db.$transaction(async (tx) => {
				const resolved = await currentAuthority(tx, options, {
					actorUserId: input.ownerUserId,
					provider: input.provider,
					now: input.issuedAt,
					purpose: "connect",
				});
				if (
					resolved.kind !== "authorized" ||
					!sameAuthority(input, resolved.authority) ||
					!resolved.authority.providerEligible
				) {
					return { kind: "authority-changed" } as const;
				}
				try {
					await tx.salesRequestMailboxOAuthAttempt.create({ data: input });
					return { kind: "created" } as const;
				} catch (error) {
					if (
						error instanceof Prisma.PrismaClientKnownRequestError &&
						error.code === "P2002"
					) {
						return { kind: "conflict" } as const;
					}
					throw error;
				}
			}, TRANSACTION_OPTIONS);
		},

		async consumeCallbackAttempt(input) {
			return db.$transaction(async (tx) => {
				const dbNow = await databaseNow(tx);
				const stored = await tx.salesRequestMailboxOAuthAttempt.findUnique({
					where: { stateDigest: input.stateDigest },
				});
				if (
					!stored ||
					stored.stateDigest !== input.stateDigest ||
					stored.ownerUserId !== input.actorUserId ||
					stored.provider !== input.provider ||
					stored.redirectKey !== input.redirectKey
				) {
					return { kind: "mismatch" } as const;
				}
				if (stored.consumedAt) return { kind: "already-consumed" } as const;

				const resolved = await currentAuthority(tx, options, {
					actorUserId: input.actorUserId,
					provider: input.provider,
					now: dbNow,
					purpose: "connect",
				});
				let terminalReason:
					| "expired"
					| "authority-changed"
					| "policy-changed"
					| null = null;
				if (stored.expiresAt <= dbNow) terminalReason = "expired";
				else if (resolved.kind !== "authorized") {
					terminalReason = "authority-changed";
				} else if (
					stored.policyRevision !== resolved.authority.policyRevision ||
					stored.salesSettingsId !== resolved.authority.salesSettingsId ||
					stored.salesSettingsRevision !==
						resolved.authority.salesSettingsRevision
				) {
					terminalReason = "policy-changed";
				} else if (!sameAuthority(stored, resolved.authority)) {
					terminalReason = "authority-changed";
				}

				const terminal =
					input.callbackKind === "cancelled" || terminalReason !== null;
				const updated = await tx.salesRequestMailboxOAuthAttempt.updateMany({
					where: { stateDigest: input.stateDigest, consumedAt: null },
					data: {
						consumedAt: dbNow,
						terminalAt: terminal ? dbNow : null,
						terminalReason:
							input.callbackKind === "cancelled"
								? "caller-cancelled"
								: terminalReason,
					},
				});
				if (updated.count !== 1) return { kind: "already-consumed" } as const;
				if (input.callbackKind === "cancelled") {
					return { kind: "cancelled" } as const;
				}
				if (terminalReason) {
					return { kind: "terminal", reason: terminalReason } as const;
				}
				const consumed = attemptRecord({ ...stored, consumedAt: dbNow });
				return consumed
					? ({ kind: "ready", attempt: consumed } as const)
					: ({ kind: "mismatch" } as const);
			}, TRANSACTION_OPTIONS);
		},

		async prepareConnectionTarget(input) {
			return db.$transaction(async (tx) => {
				const dbNow = await databaseNow(tx);
				const storedAttempt =
					await tx.salesRequestMailboxOAuthAttempt.findUnique({
						where: { stateDigest: input.attempt.stateDigest },
					});
				if (
					!storedAttempt ||
					storedAttempt.terminalAt ||
					!sameConsumedAttempt(storedAttempt, input.attempt) ||
					storedAttempt.expiresAt <= dbNow
				) {
					return { kind: "attempt-invalid" } as const;
				}
				const resolved = await currentAuthority(tx, options, {
					actorUserId: input.attempt.ownerUserId,
					provider: input.attempt.provider,
					now: dbNow,
					purpose: "connect",
				});
				if (
					resolved.kind !== "authorized" ||
					!sameAuthority(input.attempt, resolved.authority)
				) {
					return { kind: "authority-changed" } as const;
				}
				const identityHash = hashMailboxProviderAccountIdentity(
					input.attempt.provider,
					input.providerAccountId,
				);
				const existing = await tx.salesRequestMailboxConnection.findFirst({
					where: {
						provider: input.attempt.provider,
						providerAccountIdentityHash: identityHash,
					},
				});
				if (!existing) {
					return {
						kind: "prepared",
						target: {
							kind: "new",
							connectionId: input.candidateConnectionId,
						},
					} as const;
				}
				if (
					!exactProviderAccount(
						existing,
						input.attempt.provider,
						input.providerAccountId,
					) ||
					existing.ownerUserId !== input.attempt.ownerUserId ||
					existing.organizationId !== input.attempt.organizationId ||
					!existing.scopeFingerprint ||
					!reconnectableConnection(existing)
				) {
					return { kind: "identity-conflict" } as const;
				}
				return {
					kind: "prepared",
					target: {
						kind: "reconnect",
						connectionId: existing.id,
						expectedConnectionRevision: existing.revision,
						expectedScopeFingerprint: existing.scopeFingerprint,
					},
				} as const;
			}, TRANSACTION_OPTIONS);
		},

		async commitConnection(input) {
			return db.$transaction(async (tx) => {
				const dbNow = await databaseNow(tx);
				const storedAttempt =
					await tx.salesRequestMailboxOAuthAttempt.findUnique({
						where: { stateDigest: input.attempt.stateDigest },
					});
				if (
					!storedAttempt ||
					storedAttempt.terminalAt ||
					!sameConsumedAttempt(storedAttempt, input.attempt) ||
					storedAttempt.expiresAt <= dbNow
				) {
					return { kind: "attempt-invalid" } as const;
				}
				const resolved = await currentAuthority(tx, options, {
					actorUserId: input.attempt.ownerUserId,
					provider: input.attempt.provider,
					now: dbNow,
					purpose: "connect",
				});
				if (
					resolved.kind !== "authorized" ||
					!sameAuthority(input.attempt, resolved.authority)
				) {
					return { kind: "authority-changed" } as const;
				}

				const identityHash = hashMailboxProviderAccountIdentity(
					input.attempt.provider,
					input.connection.providerAccountId,
				);
				const collision = await tx.salesRequestMailboxConnection.findFirst({
					where: {
						provider: input.attempt.provider,
						providerAccountIdentityHash: identityHash,
					},
				});
				if (
					collision &&
					(collision.id !== input.target.connectionId ||
						!reconnectableConnection(collision) ||
						!exactProviderAccount(
							collision,
							input.attempt.provider,
							input.connection.providerAccountId,
						))
				) {
					return { kind: "identity-conflict" } as const;
				}

				const credentials = {
					providerAccountId: input.connection.providerAccountId,
					providerAccountIdentityHash: identityHash,
					accountEmail: input.connection.accountEmail,
					displayName: input.connection.displayName,
					grantedScopes: [...input.connection.grantedScopes],
					scopeFingerprint: input.connection.scopeFingerprint,
					accessTokenEnvelope: input.connection.accessToken,
					refreshTokenEnvelope: input.connection.refreshToken,
					tokenExpiresAt: input.connection.tokenExpiresAt,
				};
				try {
					if (input.target.kind === "new") {
						const source = defaultSource(input.attempt.provider);
						const sourceId = options.createSourceId?.() ?? randomUUID();
						const streamId = options.createStreamId?.() ?? randomUUID();
						await tx.salesRequestMailboxConnection.create({
							data: {
								id: input.target.connectionId,
								organizationId: input.attempt.organizationId,
								ownerUserId: input.attempt.ownerUserId,
								employeeProfileId: input.attempt.employeeProfileId,
								officeAuthorityKey: input.attempt.officeAuthorityKey,
								authorityRevision: input.attempt.authorityRevision,
								salesSettingsId: input.attempt.salesSettingsId,
								salesSettingsRevision: input.attempt.salesSettingsRevision,
								policyRevision: input.attempt.policyRevision,
								provider: input.attempt.provider,
								...credentials,
								excludedSenders: [],
								excludedDomains: [],
								state: "active",
								syncBlocked: false,
								healthStatus: "healthy",
							},
						});
						await tx.salesRequestMailboxSource.create({
							data: {
								id: sourceId,
								connectionId: input.target.connectionId,
								kind: source.kind,
								providerSourceId: source.providerSourceId,
								providerSourceIdentityHash: hashMailboxProviderSourceIdentity(
									source.kind,
									source.providerSourceId,
								),
								sourceKey: source.sourceKey,
								sourceKeyIdentityHash: hashMailboxSourceKey(source.sourceKey),
								selected: true,
							},
						});
						await tx.salesRequestMailboxSyncStream.create({
							data: {
								id: streamId,
								connectionId: input.target.connectionId,
								sourceId,
								status: "queued",
								nextAttemptAt: dbNow,
							},
						});
						return {
							kind: "committed",
							connectionId: input.target.connectionId,
							connectionRevision: 1,
						} as const;
					}

					const updated = await tx.salesRequestMailboxConnection.updateMany({
						where: {
							id: input.target.connectionId,
							ownerUserId: input.attempt.ownerUserId,
							organizationId: input.attempt.organizationId,
							provider: input.attempt.provider,
							providerAccountIdentityHash: identityHash,
							providerAccountId: input.connection.providerAccountId,
							revision: input.target.expectedConnectionRevision,
							scopeFingerprint: input.target.expectedScopeFingerprint,
							state: "active",
							disconnectId: null,
							disconnectPhase: null,
							disconnectStartedAt: null,
							disconnectCompletedAt: null,
							disconnectedAt: null,
						},
						data: {
							...credentials,
							employeeProfileId: input.attempt.employeeProfileId,
							officeAuthorityKey: input.attempt.officeAuthorityKey,
							authorityRevision: input.attempt.authorityRevision,
							salesSettingsId: input.attempt.salesSettingsId,
							salesSettingsRevision: input.attempt.salesSettingsRevision,
							policyRevision: input.attempt.policyRevision,
							revision: { increment: 1 },
							state: "active",
							syncBlocked: false,
							healthStatus: "healthy",
							healthOperationId: null,
							healthOperationReason: null,
							healthOperationConnectionRevision: null,
							healthLeaseId: null,
							healthLeaseExpiresAt: null,
							healthRetryAttempt: 0,
							healthNextAttemptAt: null,
							healthCheckedAt: null,
							healthRefreshedAt: null,
							healthErrorCode: null,
							disconnectId: null,
							disconnectPhase: null,
							disconnectPreviousRevision: null,
							disconnectStartedAt: null,
							disconnectCompletedAt: null,
							disconnectFailurePhase: null,
							disconnectFailureReason: null,
							disconnectFailureAt: null,
							providerRevokedAt: null,
							disconnectedAt: null,
						},
					});
					if (updated.count !== 1) {
						return { kind: "connection-changed" } as const;
					}
					await Promise.all([
						tx.salesRequestMailboxSyncStream.updateMany({
							where: { connectionId: input.target.connectionId },
							data: {
								status: "queued",
								checkpointMode: null,
								checkpointCursor: null,
								checkpointPageToken: null,
								checkpointSince: null,
								continuationFingerprints: Prisma.DbNull,
								checkpointHash: null,
								runId: null,
								leaseId: null,
								leaseExpiresAt: null,
								failureCode: null,
								failureEvidence: Prisma.DbNull,
							},
						}),
						resetDetailWork(tx, input.target.connectionId, {}, dbNow),
					]);
					return {
						kind: "committed",
						connectionId: input.target.connectionId,
						connectionRevision: input.target.expectedConnectionRevision + 1,
					} as const;
				} catch (error) {
					if (
						error instanceof Prisma.PrismaClientKnownRequestError &&
						error.code === "P2002"
					) {
						return { kind: "identity-conflict" } as const;
					}
					throw error;
				}
			}, TRANSACTION_OPTIONS);
		},

		async terminalizeAttempt(input) {
			await db.salesRequestMailboxOAuthAttempt.updateMany({
				where: {
					stateDigest: input.attempt.stateDigest,
					ownerUserId: input.attempt.ownerUserId,
					consumedAt: input.attempt.consumedAt,
					terminalAt: null,
				},
				data: { terminalAt: input.now, terminalReason: input.reason },
			});
		},
	};
}

function tokenHealthClaim(record: {
	healthOperationId: string | null;
	healthLeaseId: string | null;
	healthLeaseEpoch: number;
	healthLeaseExpiresAt: Date | null;
	id: string;
	revision: number;
	organizationId: number;
	ownerUserId: number;
	employeeProfileId: number;
	officeAuthorityKey: string;
	authorityRevision: string;
	salesSettingsId: number;
	salesSettingsRevision: number;
	policyRevision: number;
	provider: string;
	providerAccountId: string | null;
	providerAccountIdentityHash: string | null;
	grantedScopes: unknown;
	scopeFingerprint: string | null;
	accessTokenEnvelope: unknown;
	refreshTokenEnvelope: unknown;
	tokenExpiresAt: Date | null;
	healthRetryAttempt: number;
}): MailboxTokenHealthClaim | null {
	const provider = parseProvider(record.provider);
	const scopes = parseScopes(record.grantedScopes);
	const accessToken = parseEnvelope(record.accessTokenEnvelope);
	const refreshToken = parseEnvelope(record.refreshTokenEnvelope);
	if (
		!provider ||
		!record.healthOperationId ||
		!record.healthLeaseId ||
		!record.healthLeaseExpiresAt ||
		!record.providerAccountId ||
		!record.scopeFingerprint ||
		!scopes ||
		!accessToken ||
		!refreshToken
	) {
		return null;
	}
	return {
		operationId: record.healthOperationId,
		leaseId: record.healthLeaseId,
		leaseEpoch: record.healthLeaseEpoch,
		leaseExpiresAt: record.healthLeaseExpiresAt,
		connectionId: record.id,
		connectionRevision: record.revision,
		organizationId: record.organizationId,
		ownerUserId: record.ownerUserId,
		employeeProfileId: record.employeeProfileId,
		officeAuthorityKey: record.officeAuthorityKey,
		authorityRevision: record.authorityRevision,
		salesSettingsId: record.salesSettingsId,
		salesSettingsRevision: record.salesSettingsRevision,
		policyRevision: record.policyRevision,
		provider,
		providerAccountId: record.providerAccountId,
		grantedScopes: scopes,
		scopeFingerprint: record.scopeFingerprint,
		accessToken,
		refreshToken,
		tokenExpiresAt: record.tokenExpiresAt,
		retryAttempt: record.healthRetryAttempt,
	};
}

function createTokenHealthStore(
	db: Database,
	options: SalesRequestMailboxLifecycleStoreOptions,
): MailboxTokenHealthStore {
	return {
		async claimTokenHealth(input) {
			return db.$transaction(async (tx) => {
				const dbNow = await databaseNow(tx);
				const record = await tx.salesRequestMailboxConnection.findUnique({
					where: { id: input.connectionId },
				});
				if (!record || record.state !== "active") {
					return { kind: "unavailable" } as const;
				}
				if (record.revision !== input.expectedConnectionRevision) {
					if (
						record.healthOperationId === input.operationId &&
						record.healthOperationConnectionRevision ===
							input.expectedConnectionRevision &&
						record.revision === input.expectedConnectionRevision + 1 &&
						["healthy", "reauthorization-required", "dead-lettered"].includes(
							record.healthStatus,
						)
					) {
						return {
							kind: "completed",
							outcome: record.healthStatus as
								| "healthy"
								| "reauthorization-required"
								| "dead-lettered",
							connectionRevision: record.revision,
						} as const;
					}
					return { kind: "connection-changed" } as const;
				}
				const provider = parseProvider(record.provider);
				if (!provider || !record.providerAccountId) {
					return { kind: "unavailable" } as const;
				}
				const resolved = await currentAuthority(tx, options, {
					actorUserId: record.ownerUserId,
					provider,
					now: dbNow,
					purpose: "token-health",
				});
				if (
					resolved.kind !== "authorized" ||
					!sameAuthority(record, resolved.authority) ||
					!exactProviderAccount(record, provider, record.providerAccountId)
				) {
					return { kind: "unavailable" } as const;
				}
				if (
					record.healthStatus === "claimed" &&
					record.healthLeaseExpiresAt &&
					record.healthLeaseExpiresAt > dbNow
				) {
					return { kind: "lease-contended" } as const;
				}
				if (
					record.healthStatus === "claimed" &&
					record.healthLeaseExpiresAt &&
					record.healthLeaseExpiresAt <= dbNow
				) {
					const settled = await tx.salesRequestMailboxConnection.updateMany({
						where: {
							id: record.id,
							revision: record.revision,
							healthStatus: "claimed",
							healthLeaseEpoch: record.healthLeaseEpoch,
							healthLeaseExpiresAt: { lte: dbNow },
						},
						data: {
							revision: { increment: 1 },
							syncBlocked: true,
							healthStatus: "reauthorization-required",
							healthCheckedAt: dbNow,
							healthErrorCode: "refresh-outcome-unknown",
							healthLeaseId: null,
							healthLeaseExpiresAt: null,
						},
					});
					if (settled.count !== 1) {
						return { kind: "lease-contended" } as const;
					}
					await invalidateRevisionWork(tx, record.id, record.revision, dbNow);
					return {
						kind: "completed",
						outcome: "reauthorization-required",
						connectionRevision: record.revision + 1,
					} as const;
				}
				if (
					input.reason === "token-expiring" &&
					record.healthStatus === "temporarily-unavailable" &&
					record.healthNextAttemptAt &&
					record.healthNextAttemptAt > dbNow
				) {
					return { kind: "not-due" } as const;
				}
				if (
					input.reason === "token-expiring" &&
					(!record.tokenExpiresAt ||
						record.tokenExpiresAt.getTime() >
							dbNow.getTime() + input.refreshBeforeExpiryMs)
				) {
					return { kind: "not-due" } as const;
				}
				const leaseId = options.createLeaseId?.() ?? randomUUID();
				const leaseExpiresAt = new Date(
					dbNow.getTime() + input.leaseDurationMs,
				);
				const leaseEpoch = record.healthLeaseEpoch + 1;
				const claim = tokenHealthClaim({
					...record,
					healthOperationId: input.operationId,
					healthLeaseId: leaseId,
					healthLeaseEpoch: leaseEpoch,
					healthLeaseExpiresAt: leaseExpiresAt,
				});
				if (!claim) {
					const settled = await tx.salesRequestMailboxConnection.updateMany({
						where: {
							id: record.id,
							revision: record.revision,
							state: "active",
							healthLeaseEpoch: record.healthLeaseEpoch,
						},
						data: {
							revision: { increment: 1 },
							syncBlocked: true,
							healthOperationId: input.operationId,
							healthOperationReason: input.reason,
							healthOperationConnectionRevision: record.revision,
							healthStatus: "dead-lettered",
							healthCheckedAt: dbNow,
							healthErrorCode: "credentials-unavailable",
							healthLeaseId: null,
							healthLeaseExpiresAt: null,
						},
					});
					if (settled.count !== 1) {
						return { kind: "lease-contended" } as const;
					}
					await invalidateRevisionWork(tx, record.id, record.revision, dbNow);
					return {
						kind: "completed",
						outcome: "dead-lettered",
						connectionRevision: record.revision + 1,
					} as const;
				}
				const updated = await tx.salesRequestMailboxConnection.updateMany({
					where: {
						id: record.id,
						revision: record.revision,
						state: "active",
						healthLeaseEpoch: record.healthLeaseEpoch,
					},
					data: {
						healthOperationId: input.operationId,
						healthOperationReason: input.reason,
						healthOperationConnectionRevision: record.revision,
						healthStatus: "claimed",
						healthLeaseId: leaseId,
						healthLeaseEpoch: leaseEpoch,
						healthLeaseExpiresAt: leaseExpiresAt,
					},
				});
				if (updated.count !== 1) return { kind: "lease-contended" } as const;
				return { kind: "claimed", claim } as const;
			}, TRANSACTION_OPTIONS);
		},

		async commitRefreshedTokens(input) {
			return db.$transaction(async (tx) => {
				const now = await databaseNow(tx);
				const record = await tx.salesRequestMailboxConnection.findUnique({
					where: { id: input.connectionId },
				});
				if (!record || record.revision !== input.connectionRevision) {
					return { kind: "connection-changed" } as const;
				}
				const provider = parseProvider(record.provider);
				if (!provider || provider !== input.provider) {
					return { kind: "authority-changed" } as const;
				}
				const resolved = await currentAuthority(tx, options, {
					actorUserId: record.ownerUserId,
					provider,
					now,
					purpose: "token-health",
				});
				if (
					resolved.kind !== "authorized" ||
					!sameAuthority(input, resolved.authority) ||
					!exactProviderAccount(record, provider, input.providerAccountId)
				) {
					return { kind: "authority-changed" } as const;
				}
				const updated = await tx.salesRequestMailboxConnection.updateMany({
					where: {
						id: input.connectionId,
						revision: input.connectionRevision,
						state: "active",
						healthOperationId: input.operationId,
						healthLeaseId: input.leaseId,
						healthLeaseEpoch: input.leaseEpoch,
						healthLeaseExpiresAt: {
							equals: input.leaseExpiresAt,
							gt: now,
						},
					},
					data: {
						revision: { increment: 1 },
						grantedScopes: [...input.credentials.grantedScopes],
						scopeFingerprint: input.credentials.scopeFingerprint,
						accessTokenEnvelope: input.credentials.accessToken,
						refreshTokenEnvelope: input.credentials.refreshToken,
						tokenExpiresAt: input.credentials.tokenExpiresAt,
						syncBlocked: false,
						healthStatus: input.health.status,
						healthCheckedAt: input.health.checkedAt,
						healthRefreshedAt: input.health.refreshedAt,
						healthErrorCode: null,
						healthNextAttemptAt: null,
						healthRetryAttempt: 0,
						healthLeaseId: null,
						healthLeaseExpiresAt: null,
					},
				});
				if (updated.count !== 1) return { kind: "claim-lost" } as const;
				await invalidateRevisionWork(
					tx,
					input.connectionId,
					input.connectionRevision,
					now,
				);
				return {
					kind: "committed",
					connectionRevision: input.connectionRevision + 1,
				} as const;
			}, TRANSACTION_OPTIONS);
		},

		async settleTokenHealth(input) {
			return db.$transaction(async (tx) => {
				const now = await databaseNow(tx);
				const record = await tx.salesRequestMailboxConnection.findUnique({
					where: { id: input.connectionId },
				});
				if (!record || record.revision !== input.connectionRevision) {
					return { kind: "connection-changed" } as const;
				}
				const provider = parseProvider(record.provider);
				if (!provider || provider !== input.provider) {
					return { kind: "authority-changed" } as const;
				}
				const resolved = await currentAuthority(tx, options, {
					actorUserId: record.ownerUserId,
					provider,
					now,
					purpose: "token-health",
				});
				if (
					resolved.kind !== "authorized" ||
					!sameAuthority(input, resolved.authority) ||
					!exactProviderAccount(record, provider, input.providerAccountId)
				) {
					return { kind: "authority-changed" } as const;
				}
				const updated = await tx.salesRequestMailboxConnection.updateMany({
					where: {
						id: input.connectionId,
						revision: input.connectionRevision,
						state: "active",
						healthOperationId: input.operationId,
						healthLeaseId: input.leaseId,
						healthLeaseEpoch: input.leaseEpoch,
						healthLeaseExpiresAt: {
							equals: input.leaseExpiresAt,
							gt: now,
						},
					},
					data: {
						revision: input.incrementConnectionRevision
							? { increment: 1 }
							: undefined,
						syncBlocked: input.blockSync,
						healthStatus: input.status,
						healthCheckedAt: input.checkedAt,
						healthErrorCode: input.errorCode,
						healthNextAttemptAt: input.nextAttemptAt,
						healthRetryAttempt: input.retryAttempt,
						healthLeaseId: null,
						healthLeaseExpiresAt: null,
					},
				});
				if (updated.count !== 1) return { kind: "claim-lost" } as const;
				if (input.invalidatePriorRevisionWork) {
					await invalidateRevisionWork(
						tx,
						input.connectionId,
						input.connectionRevision,
						now,
					);
				}
				return {
					kind: "settled",
					connectionRevision:
						input.connectionRevision +
						(input.incrementConnectionRevision ? 1 : 0),
				} as const;
			}, TRANSACTION_OPTIONS);
		},
	};
}

async function invalidateRevisionWork(
	tx: TransactionClient,
	connectionId: string,
	connectionRevision: number,
	now: Date,
) {
	await Promise.all([
		tx.salesRequestMailboxSyncStream.updateMany({
			where: { connectionId, leasedConnectionRevision: connectionRevision },
			data: {
				status: "queued",
				runId: null,
				leaseId: null,
				leaseExpiresAt: null,
			},
		}),
		resetDetailWork(
			tx,
			connectionId,
			{ leasedConnectionRevision: connectionRevision },
			now,
		),
	]);
}

async function resetDetailWork(
	tx: TransactionClient,
	connectionId: string,
	where: { leasedConnectionRevision?: number },
	now: Date,
) {
	const resettableWhere = {
		connectionId,
		status: {
			in: ["processing", "retry-pending", "reauthorization-required"],
		},
		...where,
	};
	const leases = await tx.salesRequestMailboxMessageLease.findMany({
		where: resettableWhere,
		select: { claimedSummaryId: true },
	});
	const summaryIds = [
		...new Set(
			leases
				.map((lease) => lease.claimedSummaryId)
				.filter((id): id is string => typeof id === "string" && id.length > 0),
		),
	];
	await tx.salesRequestMailboxMessageLease.updateMany({
		where: resettableWhere,
		data: {
			status: "queued",
			runId: null,
			leaseId: null,
			leaseExpiresAt: null,
			leasedConnectionRevision: null,
			leasedPolicyRevision: null,
			claimedSummaryId: null,
			claimedSummaryRevision: null,
			sourceMembershipIdentity: null,
			retryAttempts: 0,
			nextAttemptAt: now,
			failureCode: null,
			failureEvidence: Prisma.DbNull,
			completedAt: null,
		},
	});
	if (summaryIds.length > 0) {
		await tx.salesRequestMailboxMessageSummary.updateMany({
			where: {
				id: { in: summaryIds },
				connectionId,
				active: true,
			},
			data: { detailStatus: "queued" },
		});
	}
}

async function invalidateDisconnectWork(
	tx: TransactionClient,
	connectionId: string,
) {
	await Promise.all([
		tx.salesRequestMailboxSyncStream.updateMany({
			where: { connectionId },
			data: {
				status: "blocked",
				checkpointMode: null,
				checkpointCursor: null,
				checkpointPageToken: null,
				checkpointSince: null,
				checkpointRetryAttempts: 0,
				checkpointCursorResets: 0,
				continuationFingerprints: Prisma.DbNull,
				checkpointHash: null,
				runId: null,
				leaseId: null,
				leaseExpiresAt: null,
			},
		}),
		tx.salesRequestMailboxMessageLease.updateMany({
			where: { connectionId },
			data: {
				status: "blocked",
				runId: null,
				leaseId: null,
				leaseExpiresAt: null,
			},
		}),
	]);
}

function disconnectCleanupClaim(record: {
	disconnectId: string | null;
	id: string;
	disconnectPreviousRevision: number | null;
	revision: number;
	organizationId: number;
	ownerUserId: number;
	employeeProfileId: number;
	officeAuthorityKey: string;
	authorityRevision: string;
}): MailboxDisconnectCleanupClaim | null {
	if (
		record.disconnectId === null ||
		record.disconnectPreviousRevision === null
	) {
		return null;
	}
	return {
		disconnectId: record.disconnectId,
		connectionId: record.id,
		previousConnectionRevision: record.disconnectPreviousRevision,
		connectionRevision: record.revision,
		organizationId: record.organizationId,
		ownerUserId: record.ownerUserId,
		employeeProfileId: record.employeeProfileId,
		officeAuthorityKey: record.officeAuthorityKey,
		authorityRevision: record.authorityRevision,
	};
}

function disconnectProviderClaim(
	record: Parameters<typeof disconnectCleanupClaim>[0] & {
		provider: string;
		providerAccountId: string | null;
		providerAccountIdentityHash: string | null;
		grantedScopes: unknown;
		accessTokenEnvelope: unknown;
		refreshTokenEnvelope: unknown;
		tokenExpiresAt: Date | null;
	},
): MailboxDisconnectClaim | null {
	const base = disconnectCleanupClaim(record);
	const provider = parseProvider(record.provider);
	const scopes = parseScopes(record.grantedScopes);
	const storedAccessToken = parseEnvelope(record.accessTokenEnvelope);
	const accessToken =
		storedAccessToken ??
		(provider === "gmail" ? UNAVAILABLE_DISCONNECT_SECRET : null);
	const refreshToken = record.refreshTokenEnvelope
		? parseEnvelope(record.refreshTokenEnvelope)
		: null;
	if (
		!base ||
		!provider ||
		!record.providerAccountId ||
		!exactProviderAccount(record, provider, record.providerAccountId) ||
		!scopes ||
		!accessToken
	) {
		return null;
	}
	return {
		...base,
		provider,
		providerAccountId: record.providerAccountId,
		grantedScopes: scopes,
		accessToken,
		refreshToken,
		tokenExpiresAt: record.tokenExpiresAt,
	};
}

function matchingDisconnectClaim(
	record: {
		id: string;
		disconnectId: string | null;
		disconnectPreviousRevision: number | null;
		revision: number;
		organizationId: number;
		ownerUserId: number;
		employeeProfileId: number;
		officeAuthorityKey: string;
		authorityRevision: string;
	},
	claim: MailboxDisconnectCleanupClaim,
) {
	return (
		record.id === claim.connectionId &&
		record.disconnectId === claim.disconnectId &&
		record.disconnectPreviousRevision === claim.previousConnectionRevision &&
		record.revision === claim.connectionRevision &&
		record.organizationId === claim.organizationId &&
		record.ownerUserId === claim.ownerUserId &&
		record.employeeProfileId === claim.employeeProfileId &&
		record.officeAuthorityKey === claim.officeAuthorityKey &&
		record.authorityRevision === claim.authorityRevision
	);
}

function createDisconnectStore(
	db: Database,
	options: SalesRequestMailboxLifecycleStoreOptions,
): MailboxDisconnectStore {
	return {
		async claimDisconnect(input) {
			return db.$transaction(async (tx) => {
				const record = await tx.salesRequestMailboxConnection.findUnique({
					where: { id: input.connectionId },
				});
				if (!record || record.ownerUserId !== input.actorUserId) {
					return { kind: "unavailable" } as const;
				}
				const provider = parseProvider(record.provider);
				if (!provider) return { kind: "unavailable" } as const;
				if (record.disconnectCompletedAt || record.state === "disconnected") {
					return { kind: "completed" } as const;
				}
				if (
					record.disconnectId &&
					record.disconnectPreviousRevision ===
						input.expectedConnectionRevision &&
					record.revision === input.expectedConnectionRevision + 1
				) {
					const cleanup = disconnectCleanupClaim(record);
					if (!cleanup) return { kind: "connection-changed" } as const;
					if (record.disconnectPhase === "cleanup") {
						return { kind: "cleanup-required", claim: cleanup } as const;
					}
					const providerClaim = disconnectProviderClaim(record);
					return providerClaim
						? ({
								kind: "provider-revocation-required",
								claim: providerClaim,
							} as const)
						: ({ kind: "cleanup-required", claim: cleanup } as const);
				}
				const resolved = await currentAuthority(tx, options, {
					actorUserId: input.actorUserId,
					provider,
					now: input.now,
					purpose: "disconnect",
				});
				if (
					resolved.kind !== "authorized" ||
					resolved.authority.organizationId !== record.organizationId ||
					resolved.authority.ownerUserId !== record.ownerUserId ||
					resolved.authority.employeeProfileId !== record.employeeProfileId ||
					resolved.authority.officeAuthorityKey !== record.officeAuthorityKey ||
					resolved.authority.authorityRevision !== record.authorityRevision
				) {
					return { kind: "unavailable" } as const;
				}
				if (
					record.revision !== input.expectedConnectionRevision ||
					record.state !== "active"
				) {
					return { kind: "connection-changed" } as const;
				}
				const disconnectId = options.createDisconnectId?.() ?? randomUUID();
				const providerMaterial = disconnectProviderClaim({
					...record,
					disconnectId,
					disconnectPreviousRevision: record.revision,
					revision: record.revision + 1,
				});
				const disconnectPhase = providerMaterial
					? "provider-revocation"
					: "cleanup";
				const updated = await tx.salesRequestMailboxConnection.updateMany({
					where: {
						id: record.id,
						ownerUserId: input.actorUserId,
						revision: input.expectedConnectionRevision,
						state: "active",
					},
					data: {
						revision: { increment: 1 },
						state: "disconnecting",
						syncBlocked: true,
						disconnectId,
						disconnectPhase,
						disconnectPreviousRevision: record.revision,
						disconnectStartedAt: input.now,
						healthLeaseId: null,
						healthLeaseExpiresAt: null,
					},
				});
				if (updated.count !== 1) return { kind: "connection-changed" } as const;
				await invalidateDisconnectWork(tx, record.id);
				const cleanup = disconnectCleanupClaim({
					...record,
					disconnectId,
					disconnectPreviousRevision: record.revision,
					revision: record.revision + 1,
				});
				if (!cleanup) return { kind: "connection-changed" } as const;
				return providerMaterial
					? ({
							kind: "provider-revocation-required",
							claim: providerMaterial,
						} as const)
					: ({ kind: "cleanup-required", claim: cleanup } as const);
			}, TRANSACTION_OPTIONS);
		},

		async recordProviderRevoked(input) {
			const updated = await db.salesRequestMailboxConnection.updateMany({
				where: {
					id: input.connectionId,
					disconnectId: input.disconnectId,
					disconnectPreviousRevision: input.previousConnectionRevision,
					revision: input.connectionRevision,
					ownerUserId: input.ownerUserId,
					organizationId: input.organizationId,
					employeeProfileId: input.employeeProfileId,
					officeAuthorityKey: input.officeAuthorityKey,
					authorityRevision: input.authorityRevision,
					state: "disconnecting",
					disconnectPhase: "provider-revocation",
				},
				data: {
					disconnectPhase: "cleanup",
					providerRevokedAt: input.now,
					disconnectFailurePhase: null,
					disconnectFailureReason: null,
					disconnectFailureAt: null,
				},
			});
			return updated.count === 1
				? ({ kind: "cleanup-required" } as const)
				: ({ kind: "claim-lost" } as const);
		},

		async recordDisconnectFailure(input) {
			const updated = await db.salesRequestMailboxConnection.updateMany({
				where: {
					id: input.connectionId,
					disconnectId: input.disconnectId,
					disconnectPreviousRevision: input.previousConnectionRevision,
					revision: input.connectionRevision,
					ownerUserId: input.ownerUserId,
					organizationId: input.organizationId,
					employeeProfileId: input.employeeProfileId,
					officeAuthorityKey: input.officeAuthorityKey,
					authorityRevision: input.authorityRevision,
					state: "disconnecting",
				},
				data: {
					disconnectFailurePhase: input.phase,
					disconnectFailureReason: input.reason,
					disconnectFailureAt: input.now,
				},
			});
			return updated.count === 1
				? ({ kind: "recorded" } as const)
				: ({ kind: "claim-lost" } as const);
		},

		async completeDisconnect(input) {
			return db.$transaction(async (tx) => {
				const record = await tx.salesRequestMailboxConnection.findUnique({
					where: { id: input.connectionId },
				});
				if (
					!record ||
					!matchingDisconnectClaim(record, input) ||
					record.state !== "disconnecting" ||
					record.disconnectPhase !== "cleanup"
				) {
					return { kind: "claim-lost" } as const;
				}
				const updated = await tx.salesRequestMailboxConnection.updateMany({
					where: {
						id: input.connectionId,
						disconnectId: input.disconnectId,
						disconnectPreviousRevision: input.previousConnectionRevision,
						revision: input.connectionRevision,
						state: "disconnecting",
						disconnectPhase: "cleanup",
					},
					data: {
						state: "disconnected",
						providerAccountId: null,
						providerAccountIdentityHash: null,
						accountEmail: null,
						displayName: null,
						grantedScopes: Prisma.DbNull,
						scopeFingerprint: null,
						accessTokenEnvelope: Prisma.DbNull,
						refreshTokenEnvelope: Prisma.DbNull,
						tokenExpiresAt: null,
						excludedSenders: [],
						excludedDomains: [],
						lastSyncAt: null,
						healthOperationId: null,
						healthOperationReason: null,
						healthOperationConnectionRevision: null,
						healthLeaseId: null,
						healthLeaseExpiresAt: null,
						healthNextAttemptAt: null,
						healthErrorCode: null,
						disconnectPhase: "completed",
						disconnectCompletedAt: input.now,
						disconnectedAt: input.now,
						disconnectFailurePhase: null,
						disconnectFailureReason: null,
						disconnectFailureAt: null,
					},
				});
				if (updated.count !== 1) return { kind: "claim-lost" } as const;
				await tx.salesRequestMailboxQueueProjection.deleteMany({
					where: { connectionId: input.connectionId },
				});
				await tx.salesRequestMailboxSourceMembership.deleteMany({
					where: { connectionId: input.connectionId },
				});
				await tx.salesRequestMailboxMessageSnapshot.deleteMany({
					where: { connectionId: input.connectionId },
				});
				await tx.salesRequestMailboxMessageLease.deleteMany({
					where: { connectionId: input.connectionId },
				});
				await tx.salesRequestMailboxMessageSummary.deleteMany({
					where: { connectionId: input.connectionId },
				});
				await tx.salesRequestMailboxSyncStream.deleteMany({
					where: { connectionId: input.connectionId },
				});
				await tx.salesRequestMailboxSource.deleteMany({
					where: { connectionId: input.connectionId },
				});
				return { kind: "completed" } as const;
			}, TRANSACTION_OPTIONS);
		},
	};
}

export function createSalesRequestMailboxLifecycleStores(
	db: Database,
	options: SalesRequestMailboxLifecycleStoreOptions,
) {
	return {
		connection: createConnectionStore(db, options),
		tokenHealth: createTokenHealthStore(db, options),
		disconnect: createDisconnectStore(db, options),
	} satisfies {
		connection: MailboxConnectionLifecycleStore;
		tokenHealth: MailboxTokenHealthStore;
		disconnect: MailboxDisconnectStore;
	};
}
