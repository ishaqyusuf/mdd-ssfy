import { createHash } from "node:crypto";
import {
	buildMailboxMessageContentHash,
	buildMailboxQueueIdentity,
	buildMailboxSourceMembershipIdentity,
	decryptMailboxSecret,
	mailboxEncryptedSecretSchema,
	salesRequestMailboxPolicySchema,
} from "@gnd/sales-request-mailbox";
import type {
	MailboxMessageDetailStore,
	MailboxSyncCheckpoint,
	MailboxSyncMutationResult,
	MailboxSyncSource,
	MailboxSyncStore,
} from "@gnd/sales-request-mailbox";
import { Prisma } from "../index";
import type { Database, TransactionClient } from "../index";
import {
	hashMailboxProviderAccountIdentity,
	hashMailboxProviderMessageIdentity,
	hashMailboxProviderSourceIdentity,
	hashMailboxSourceKey,
} from "./sales-request-mailbox-identities";

type LockedExpiredSnapshot = {
	id: string;
	connectionId: string;
	provider: string;
	providerMessageId: string;
	providerMessageIdentityHash: string;
	dbNow: Date;
};

const READY_SYNC_STATUSES = ["queued", "retry-pending", "continuation-pending"];
const READY_DETAIL_STATUSES = ["queued", "retry-pending"];
const MAX_LEASE_DURATION_MS = 15 * 60_000;

type MailboxConnectionRow = NonNullable<
	Awaited<ReturnType<Database["salesRequestMailboxConnection"]["findUnique"]>>
>;

export type SalesRequestMailboxContentAuthorityResolver = (
	tx: TransactionClient,
	connection: MailboxConnectionRow,
) => Promise<{
	current: boolean;
	ownerActive: boolean;
	policy: unknown;
}>;

export type SalesRequestMailboxContentStoreDependencies = {
	resolveAuthority: SalesRequestMailboxContentAuthorityResolver;
	keyRing: { resolve(keyVersion: string): Buffer };
};

async function databaseNow(tx: TransactionClient) {
	const rows = await tx.$queryRaw<Array<{ dbNow: Date }>>(
		Prisma.sql`SELECT CURRENT_TIMESTAMP(3) AS dbNow`,
	);
	const now = rows[0]?.dbNow;
	if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
		throw new Error("invalid-mailbox-database-clock");
	}
	return now;
}

function leaseExpiryFromDatabaseClock(
	input: {
		now: Date;
		leaseExpiresAt: Date;
	},
	dbNow: Date,
) {
	const durationMs = input.leaseExpiresAt.getTime() - input.now.getTime();
	if (
		!Number.isFinite(durationMs) ||
		durationMs < 1_000 ||
		durationMs > MAX_LEASE_DURATION_MS
	) {
		return null;
	}
	return new Date(dbNow.getTime() + durationMs);
}

function jsonArray(value: Prisma.JsonValue | null): string[] | null {
	if (
		!Array.isArray(value) ||
		!value.every(
			(item) =>
				typeof item === "string" && item.length > 0 && item.length <= 512,
		)
	) {
		return null;
	}
	return value as string[];
}

function encryptedSecret(value: Prisma.JsonValue | null) {
	const parsed = mailboxEncryptedSecretSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}

function connectionTokens(
	connection: MailboxConnectionRow,
	dependencies: SalesRequestMailboxContentStoreDependencies,
) {
	const access = encryptedSecret(connection.accessTokenEnvelope);
	const refresh = encryptedSecret(connection.refreshTokenEnvelope);
	const grantedScopes = jsonArray(connection.grantedScopes);
	if (!access || !grantedScopes) return null;
	return {
		accessToken: decryptMailboxSecret({
			envelope: access,
			resolveKey: dependencies.keyRing.resolve,
			binding: `${connection.id}:access-token`,
		}),
		refreshToken: refresh
			? decryptMailboxSecret({
					envelope: refresh,
					resolveKey: dependencies.keyRing.resolve,
					binding: `${connection.id}:refresh-token`,
				})
			: undefined,
		expiresAt: connection.tokenExpiresAt ?? undefined,
		grantedScopes,
	};
}

async function selectedConnectionSources(
	tx: TransactionClient,
	connectionId: string,
) {
	return tx.salesRequestMailboxSource.findMany({
		where: { connectionId, selected: true },
		select: {
			id: true,
			kind: true,
			providerSourceId: true,
			providerSourceIdentityHash: true,
			sourceKey: true,
			sourceKeyIdentityHash: true,
		},
		orderBy: [{ id: "asc" }],
	});
}

function connectionConfiguration(
	connection: MailboxConnectionRow,
	sources: Awaited<ReturnType<typeof selectedConnectionSources>>,
) {
	if (
		!connection.providerAccountId ||
		!connection.providerAccountIdentityHash ||
		hashMailboxProviderAccountIdentity(
			connection.provider,
			connection.providerAccountId,
		) !== connection.providerAccountIdentityHash ||
		!connection.accountEmail
	) {
		return null;
	}
	const excludedSenders = jsonArray(connection.excludedSenders);
	const excludedDomains = jsonArray(connection.excludedDomains);
	if (!excludedSenders || !excludedDomains) return null;
	const folderIds: string[] = [];
	const labelIds: string[] = [];
	for (const source of sources) {
		if (
			hashMailboxProviderSourceIdentity(
				source.kind,
				source.providerSourceId,
			) !== source.providerSourceIdentityHash ||
			hashMailboxSourceKey(source.sourceKey) !== source.sourceKeyIdentityHash
		) {
			return null;
		}
		if (source.kind === "gmail-label") labelIds.push(source.providerSourceId);
		else if (source.kind === "graph-folder")
			folderIds.push(source.providerSourceId);
		else return null;
	}
	return {
		organizationId: connection.organizationId,
		ownerUserId: connection.ownerUserId,
		provider: connection.provider,
		providerAccountId: connection.providerAccountId,
		accountEmail: connection.accountEmail,
		displayName: connection.displayName ?? undefined,
		folderIds,
		labelIds,
		excludedSenders,
		excludedDomains,
		automationMode: connection.automationMode,
		notifyOnNeedsReview: connection.notifyOnNeedsReview,
	};
}

function checkpointFromRow(row: {
	checkpointMode: string | null;
	checkpointCursor: string | null;
	checkpointPageToken: string | null;
	checkpointSince: Date | null;
	checkpointRetryAttempts: number;
	checkpointCursorResets: number;
	continuationFingerprints: Prisma.JsonValue | null;
}): MailboxSyncCheckpoint | null {
	if (!row.checkpointMode || !row.checkpointSince) return null;
	const fingerprints = jsonArray(row.continuationFingerprints);
	if (
		(row.checkpointMode !== "incremental" &&
			row.checkpointMode !== "recovery-full") ||
		!fingerprints
	) {
		throw new Error("invalid-mailbox-sync-checkpoint");
	}
	return {
		mode: row.checkpointMode,
		cursor: row.checkpointCursor,
		pageToken: row.checkpointPageToken,
		since: row.checkpointSince,
		retryAttempts: row.checkpointRetryAttempts,
		cursorResets: row.checkpointCursorResets,
		continuationFingerprints: fingerprints,
	};
}

function checkpointData(value: MailboxSyncCheckpoint) {
	return {
		checkpointMode: value.mode,
		checkpointCursor: value.cursor,
		checkpointPageToken: value.pageToken,
		checkpointSince: value.since,
		checkpointRetryAttempts: value.retryAttempts,
		checkpointCursorResets: value.cursorResets,
		continuationFingerprints:
			value.continuationFingerprints as Prisma.InputJsonValue,
	};
}

function sameCheckpoint(
	left: MailboxSyncCheckpoint | null,
	right: MailboxSyncCheckpoint | null,
) {
	if (!left || !right) return left === right;
	return (
		left.mode === right.mode &&
		left.cursor === right.cursor &&
		left.pageToken === right.pageToken &&
		left.since.getTime() === right.since.getTime() &&
		left.retryAttempts === right.retryAttempts &&
		left.cursorResets === right.cursorResets &&
		JSON.stringify(left.continuationFingerprints) ===
			JSON.stringify(right.continuationFingerprints)
	);
}

function sourceMatches(
	row: { kind: string; providerSourceId: string; sourceKey: string },
	source: MailboxSyncSource,
) {
	return source.kind === "gmail-label"
		? row.kind === source.kind &&
				row.providerSourceId === source.labelId &&
				row.sourceKey === source.key
		: row.kind === source.kind &&
				row.providerSourceId === source.folderId &&
				row.sourceKey === source.key;
}

function authorityFenceMatches(
	connection: MailboxConnectionRow,
	fence: {
		organizationId: number;
		ownerUserId: number;
		provider: string;
		connectionRevision: number;
		policyRevision: number;
	},
) {
	return (
		connection.organizationId === fence.organizationId &&
		connection.ownerUserId === fence.ownerUserId &&
		connection.provider === fence.provider &&
		connection.revision === fence.connectionRevision &&
		connection.policyRevision === fence.policyRevision &&
		connection.state === "active" &&
		!connection.syncBlocked
	);
}

function leaseFenceMatches(
	row: {
		runId: string | null;
		leaseId: string | null;
		leaseEpoch: number;
		leaseExpiresAt: Date | null;
	},
	input: {
		runId: string;
		leaseFence: { leaseId: string; epoch: number; expiresAt: Date };
	},
	dbNow: Date,
) {
	return (
		row.runId === input.runId &&
		row.leaseId === input.leaseFence.leaseId &&
		row.leaseEpoch === input.leaseFence.epoch &&
		row.leaseExpiresAt?.getTime() === input.leaseFence.expiresAt.getTime() &&
		row.leaseExpiresAt.getTime() > dbNow.getTime()
	);
}

async function selectedSourceForInput(
	tx: TransactionClient,
	connectionId: string,
	source: MailboxSyncSource,
) {
	const candidate = await tx.salesRequestMailboxSource.findFirst({
		where: {
			connectionId,
			sourceKeyIdentityHash: hashMailboxSourceKey(source.key),
			selected: true,
		},
	});
	return candidate &&
		sourceMatches(candidate, source) &&
		hashMailboxProviderSourceIdentity(
			candidate.kind,
			candidate.providerSourceId,
		) === candidate.providerSourceIdentityHash &&
		hashMailboxSourceKey(candidate.sourceKey) ===
			candidate.sourceKeyIdentityHash
		? candidate
		: null;
}

async function lockExactSyncStream(
	tx: TransactionClient,
	connectionId: string,
	sourceId: string,
) {
	await tx.$queryRaw(
		Prisma.sql`SELECT id FROM SalesRequestMailboxSyncStream
			WHERE connectionId = ${connectionId} AND sourceId = ${sourceId}
			FOR UPDATE`,
	);
}

/** Prisma implementation of the one-source-at-a-time mailbox synchronization store. */
export function createPrismaSalesRequestMailboxSyncStore(
	db: Database,
	dependencies: SalesRequestMailboxContentStoreDependencies,
): MailboxSyncStore {
	async function mutate(
		input: {
			runId: string;
			connectionId: string;
			source: MailboxSyncSource;
			leaseFence: { leaseId: string; epoch: number; expiresAt: Date };
			authorityFence: {
				organizationId: number;
				ownerUserId: number;
				provider: "gmail" | "microsoft-graph";
				connectionRevision: number;
				policyRevision: number;
				ownerActive: boolean;
				connectionActive: boolean;
			};
		},
		apply: (
			tx: TransactionClient,
			stream: NonNullable<
				Awaited<
					ReturnType<
						TransactionClient["salesRequestMailboxSyncStream"]["findFirst"]
					>
				>
			>,
			dbNow: Date,
			// biome-ignore lint/suspicious/noConfusingVoidType: successful callbacks may only mutate.
		) => Promise<MailboxSyncMutationResult | void>,
		options: {
			allowInactiveOwner?: boolean;
			allowInvalidPolicy?: boolean;
		} = {},
	): Promise<MailboxSyncMutationResult> {
		const result = await db.$transaction(
			async (tx) => {
				const dbNow = await databaseNow(tx);
				const exactSource = await selectedSourceForInput(
					tx,
					input.connectionId,
					input.source,
				);
				if (!exactSource) return { kind: "authority-changed" } as const;
				await lockExactSyncStream(tx, input.connectionId, exactSource.id);
				const stream = await tx.salesRequestMailboxSyncStream.findFirst({
					where: {
						connectionId: input.connectionId,
						sourceId: exactSource.id,
					},
				});
				if (!stream || !leaseFenceMatches(stream, input, dbNow)) {
					return { kind: "lease-lost" } as const;
				}
				const [connection, source] = await Promise.all([
					tx.salesRequestMailboxConnection.findUnique({
						where: { id: input.connectionId },
					}),
					Promise.resolve(exactSource),
				]);
				if (
					!connection ||
					!source ||
					!sourceMatches(source, input.source) ||
					!authorityFenceMatches(connection, input.authorityFence)
				) {
					return { kind: "authority-changed" } as const;
				}
				const authority = await dependencies.resolveAuthority(tx, connection);
				const policy = salesRequestMailboxPolicySchema.safeParse(
					authority.policy,
				);
				if (
					!authority.current ||
					authority.ownerActive !== input.authorityFence.ownerActive ||
					(!options.allowInactiveOwner && !authority.ownerActive) ||
					(!options.allowInvalidPolicy && !policy.success) ||
					(policy.success &&
						policy.data.revision !== input.authorityFence.policyRevision)
				) {
					return { kind: "authority-changed" } as const;
				}
				const outcome = await apply(tx, stream, dbNow);
				return outcome ?? ({ kind: "applied" } as const);
			},
			{ maxWait: 5_000, timeout: 15_000 },
		);
		return result ?? { kind: "applied" };
	}

	return {
		async claimLease(input) {
			return db.$transaction(
				async (tx) => {
					const dbNow = await databaseNow(tx);
					const leaseExpiresAt = leaseExpiryFromDatabaseClock(input, dbNow);
					if (!leaseExpiresAt) return { kind: "contended" } as const;
					const source = await selectedSourceForInput(
						tx,
						input.connectionId,
						input.source,
					);
					if (!source) return { kind: "not-found" } as const;
					await lockExactSyncStream(tx, input.connectionId, source.id);
					const stream = await tx.salesRequestMailboxSyncStream.findFirst({
						where: {
							connectionId: input.connectionId,
							sourceId: source.id,
							status: { in: READY_SYNC_STATUSES },
							nextAttemptAt: { lte: dbNow },
							OR: [
								{ leaseExpiresAt: null },
								{ leaseExpiresAt: { lte: dbNow } },
							],
						},
					});
					if (
						!stream ||
						!READY_SYNC_STATUSES.includes(stream.status) ||
						stream.nextAttemptAt.getTime() > dbNow.getTime()
					) {
						return { kind: "not-found" } as const;
					}
					if (
						stream.leaseExpiresAt &&
						stream.leaseExpiresAt.getTime() > dbNow.getTime()
					) {
						return { kind: "contended" } as const;
					}
					const [connection, allSources] = await Promise.all([
						tx.salesRequestMailboxConnection.findUnique({
							where: { id: input.connectionId },
						}),
						selectedConnectionSources(tx, input.connectionId),
					]);
					if (
						!connection ||
						!source.selected ||
						!sourceMatches(source, input.source) ||
						connection.state !== "active" ||
						connection.syncBlocked
					) {
						return { kind: "not-found" } as const;
					}
					const authority = await dependencies.resolveAuthority(tx, connection);
					const configuration = connectionConfiguration(connection, allSources);
					const tokens = connectionTokens(connection, dependencies);
					if (!authority.current || !configuration || !tokens) {
						return { kind: "not-found" } as const;
					}
					const epoch = stream.leaseEpoch + 1;
					const changed = await tx.salesRequestMailboxSyncStream.updateMany({
						where: {
							id: stream.id,
							leaseEpoch: stream.leaseEpoch,
							status: { in: READY_SYNC_STATUSES },
							nextAttemptAt: { lte: dbNow },
							OR: [
								{ leaseExpiresAt: null },
								{ leaseExpiresAt: { lte: dbNow } },
							],
						},
						data: {
							status: "processing",
							runId: input.runId,
							leaseId: input.runId,
							leaseEpoch: epoch,
							leaseExpiresAt,
							leasedConnectionRevision: connection.revision,
							leasedPolicyRevision: connection.policyRevision,
						},
					});
					if (changed.count !== 1) return { kind: "contended" } as const;
					return {
						kind: "claimed",
						lease: {
							connectionId: connection.id,
							leaseFence: {
								leaseId: input.runId,
								epoch,
								expiresAt: leaseExpiresAt,
							},
							authorityFence: {
								organizationId: connection.organizationId,
								ownerUserId: connection.ownerUserId,
								provider: connection.provider as "gmail" | "microsoft-graph",
								connectionRevision: connection.revision,
								policyRevision: connection.policyRevision,
								ownerActive: authority.ownerActive,
								connectionActive: true,
							},
							connection: configuration,
							policy: authority.policy,
							tokens,
							checkpoint: checkpointFromRow(stream),
						},
					} as const;
				},
				{ maxWait: 5_000, timeout: 15_000 },
			);
		},

		async commitPageAndCheckpoint(input) {
			return mutate(input, async (tx, stream, dbNow) => {
				const persisted = checkpointFromRow(stream);
				if (!sameCheckpoint(persisted, input.expectedCheckpoint)) {
					return { kind: "lease-lost" } as const;
				}
				for (const projection of input.summaries) {
					if (
						projection.connectionId !== input.connectionId ||
						projection.provider !== input.authorityFence.provider ||
						projection.sourceKey !== input.source.key
					) {
						throw new Error("invalid-mailbox-sync-summary-projection");
					}
					const message = projection.summary;
					const identityHash = hashMailboxProviderMessageIdentity(
						projection.provider,
						message.providerMessageId,
					);
					const projectionHash = `msp1:${createHash("sha256")
						.update("gnd:sales-request-mailbox-summary:v1\0")
						.update(
							JSON.stringify({
								thread: message.providerThreadId ?? null,
								folder: message.folderId ?? null,
								labels: message.labelIds,
								from: message.fromEmail,
								name: message.fromName ?? null,
								subject: message.subject ?? null,
								receivedAt: message.receivedAt.toISOString(),
								attachments: message.hasAttachments,
								headers: message.headers,
								disposition: projection.disposition,
							}),
						)
						.digest("hex")}`;
					const existing = await tx.salesRequestMailboxMessageSummary.findFirst(
						{
							where: {
								connectionId: projection.connectionId,
								sourceId: stream.sourceId,
								providerMessageIdentityHash: identityHash,
							},
						},
					);
					if (
						existing &&
						existing.providerMessageId !== message.providerMessageId
					) {
						throw new Error("mailbox-message-identity-collision");
					}
					const summaryRevision =
						existing?.projectionHash === projectionHash
							? existing.summaryRevision
							: (existing?.summaryRevision ?? 0) + 1;
					const data = {
						provider: projection.provider,
						providerMessageId: message.providerMessageId,
						providerMessageIdentityHash: identityHash,
						providerThreadId: message.providerThreadId ?? null,
						providerFolderId: message.folderId ?? null,
						providerLabelIds: [...message.labelIds],
						fromEmail: message.fromEmail,
						fromName: message.fromName ?? null,
						subject: message.subject ?? null,
						receivedAt: message.receivedAt,
						hasAttachments: message.hasAttachments,
						automationHeaders: message.headers,
						projectionHash,
						summaryRevision,
						disposition: projection.disposition.accepted
							? "accepted"
							: "excluded",
						exclusionReason:
							"reason" in projection.disposition
								? projection.disposition.reason
								: null,
						active: true,
						detailStatus: projection.disposition.accepted
							? "queued"
							: "suppressed",
						tombstonedAt: null,
						projectedAt: dbNow,
					};
					if (existing) {
						await tx.salesRequestMailboxMessageSummary.update({
							where: { id: existing.id },
							data,
						});
					} else {
						await tx.salesRequestMailboxMessageSummary.create({
							data: {
								...data,
								connectionId: projection.connectionId,
								sourceId: stream.sourceId,
							},
						});
					}
				}
				for (const tombstone of input.tombstones) {
					if (
						tombstone.connectionId !== input.connectionId ||
						tombstone.provider !== input.authorityFence.provider ||
						tombstone.sourceKey !== input.source.key
					) {
						throw new Error("invalid-mailbox-sync-tombstone-projection");
					}
					const identityHash = hashMailboxProviderMessageIdentity(
						tombstone.provider,
						tombstone.providerMessageId,
					);
					const candidates =
						await tx.salesRequestMailboxMessageSummary.findMany({
							where: {
								connectionId: tombstone.connectionId,
								sourceId: stream.sourceId,
								providerMessageIdentityHash: identityHash,
							},
							select: { id: true, provider: true, providerMessageId: true },
						});
					for (const candidate of candidates) {
						if (
							candidate.provider !== tombstone.provider ||
							candidate.providerMessageId !== tombstone.providerMessageId
						) {
							throw new Error("mailbox-message-identity-collision");
						}
						await tx.salesRequestMailboxMessageSummary.update({
							where: { id: candidate.id },
							data: {
								active: false,
								detailStatus: "withdrawn",
								tombstonedAt: dbNow,
							},
						});
					}
					const memberships =
						await tx.salesRequestMailboxSourceMembership.findMany({
							where: {
								connectionId: tombstone.connectionId,
								sourceId: stream.sourceId,
								providerMessageIdentityHash: identityHash,
								state: "active",
							},
							select: { id: true, providerMessageId: true },
						});
					for (const membership of memberships) {
						if (membership.providerMessageId !== tombstone.providerMessageId) {
							throw new Error("mailbox-message-identity-collision");
						}
						await tx.salesRequestMailboxSourceMembership.update({
							where: { id: membership.id },
							data: {
								state: "inactive",
								activeKey: null,
								deactivatedAt: dbNow,
								withdrawalReason: "provider-not-found",
							},
						});
					}
					await reconcileCurrentQueueProjection(tx, {
						connectionId: tombstone.connectionId,
						provider: tombstone.provider,
						providerMessageId: tombstone.providerMessageId,
						identityHash,
						dbNow,
					});
				}
				await tx.salesRequestMailboxSyncStream.update({
					where: { id: stream.id },
					data: checkpointData(input.nextCheckpoint),
				});
			});
		},

		async checkpointCursorReset(input) {
			return mutate(input, async (tx, stream) => {
				if (
					!sameCheckpoint(checkpointFromRow(stream), input.expectedCheckpoint)
				) {
					return { kind: "lease-lost" } as const;
				}
				await tx.salesRequestMailboxSyncStream.update({
					where: { id: stream.id },
					data: checkpointData(input.nextCheckpoint),
				});
			});
		},

		async settleSuppressed(input) {
			return mutate(
				input,
				async (tx, stream) => {
					await tx.salesRequestMailboxSyncStream.update({
						where: { id: stream.id },
						data: {
							status: "suppressed",
							failureCode: input.reason,
							leaseId: null,
							leaseExpiresAt: null,
						},
					});
				},
				{
					allowInactiveOwner: input.reason === "owner-inactive",
					allowInvalidPolicy: input.reason === "invalid-policy",
				},
			);
		},

		async settleComplete(input) {
			return mutate(input, async (tx, stream, dbNow) => {
				await tx.salesRequestMailboxSyncStream.update({
					where: { id: stream.id },
					data: {
						...checkpointData(input.checkpoint),
						status: "complete",
						lastPagesFetched: input.pagesFetched,
						lastMessagesProjected: input.messagesProjected,
						lastMessagesSuppressed: input.messagesSuppressed,
						lastTombstonesProjected: input.tombstonesProjected,
						completedAt: dbNow,
						leaseId: null,
						leaseExpiresAt: null,
					},
				});
				await tx.salesRequestMailboxConnection.update({
					where: { id: input.connectionId },
					data: { lastSyncAt: dbNow },
				});
			});
		},

		async settleContinuation(input) {
			return mutate(input, async (tx, stream, dbNow) => {
				await tx.salesRequestMailboxSyncStream.update({
					where: { id: stream.id },
					data: {
						...checkpointData(input.checkpoint),
						status: "continuation-pending",
						nextAttemptAt: dbNow,
						lastPagesFetched: input.pagesFetched,
						lastMessagesProjected: input.messagesProjected,
						lastMessagesSuppressed: input.messagesSuppressed,
						lastTombstonesProjected: input.tombstonesProjected,
						leaseId: null,
						leaseExpiresAt: null,
					},
				});
			});
		},

		async settleRetry(input) {
			return mutate(input, async (tx, stream, dbNow) => {
				await tx.salesRequestMailboxSyncStream.update({
					where: { id: stream.id },
					data: {
						...checkpointData(input.checkpoint),
						status: "retry-pending",
						nextAttemptAt: new Date(dbNow.getTime() + input.retryAfterMs),
						failureCode: input.evidence.code,
						failureEvidence: input.evidence,
						leaseId: null,
						leaseExpiresAt: null,
					},
				});
			});
		},

		async settleReauthorization(input) {
			return mutate(input, async (tx, stream) => {
				await tx.salesRequestMailboxSyncStream.update({
					where: { id: stream.id },
					data: {
						...checkpointData(input.checkpoint),
						status: "reauthorization-required",
						failureCode: input.evidence.code,
						failureEvidence: input.evidence,
						leaseId: null,
						leaseExpiresAt: null,
					},
				});
			});
		},

		async settleDeadLetter(input) {
			return mutate(input, async (tx, stream) => {
				await tx.salesRequestMailboxSyncStream.update({
					where: { id: stream.id },
					data: {
						...checkpointData(input.checkpoint),
						status: "dead-lettered",
						failureCode: input.reason,
						failureEvidence: input.evidence ?? Prisma.JsonNull,
						leaseId: null,
						leaseExpiresAt: null,
					},
				});
			});
		},
	};
}

async function lockMessageLease(
	tx: TransactionClient,
	connectionId: string,
	providerMessageIdentityHash: string,
) {
	await tx.$queryRaw(
		Prisma.sql`SELECT id FROM SalesRequestMailboxMessageLease
			WHERE connectionId = ${connectionId}
			  AND providerMessageIdentityHash = ${providerMessageIdentityHash}
			FOR UPDATE`,
	);
}

async function reconcileCurrentQueueProjection(
	tx: TransactionClient,
	input: {
		connectionId: string;
		provider: string;
		providerMessageId: string;
		identityHash: string;
		dbNow: Date;
	},
) {
	const memberships = await tx.salesRequestMailboxSourceMembership.findMany({
		where: {
			connectionId: input.connectionId,
			providerMessageIdentityHash: input.identityHash,
			state: "active",
			activeKey: { not: null },
		},
		select: {
			id: true,
			sourceId: true,
			snapshotId: true,
			providerMessageId: true,
			summaryRevision: true,
		},
	});
	for (const membership of memberships) {
		if (membership.providerMessageId !== input.providerMessageId) {
			throw new Error("mailbox-message-identity-collision");
		}
	}
	const sources = memberships.length
		? await tx.salesRequestMailboxSource.findMany({
				where: {
					id: { in: [...new Set(memberships.map((row) => row.sourceId))] },
					connectionId: input.connectionId,
					selected: true,
				},
			})
		: [];
	for (const source of sources) {
		if (
			hashMailboxProviderSourceIdentity(
				source.kind,
				source.providerSourceId,
			) !== source.providerSourceIdentityHash ||
			hashMailboxSourceKey(source.sourceKey) !== source.sourceKeyIdentityHash
		) {
			throw new Error("mailbox-source-identity-collision");
		}
	}
	const sourceById = new Map(
		sources.map((source) => [source.id, source] as const),
	);
	const alternatives = memberships
		.filter((membership) => sourceById.has(membership.sourceId))
		.sort((left, right) => {
			const sourceOrder = (
				sourceById.get(left.sourceId)?.sourceKey ?? ""
			).localeCompare(sourceById.get(right.sourceId)?.sourceKey ?? "");
			return sourceOrder || left.id.localeCompare(right.id);
		});
	const queue = await tx.salesRequestMailboxQueueProjection.findFirst({
		where: {
			connectionId: input.connectionId,
			providerMessageIdentityHash: input.identityHash,
		},
	});
	if (
		queue &&
		(queue.provider !== input.provider ||
			queue.providerMessageId !== input.providerMessageId)
	) {
		throw new Error("mailbox-message-identity-collision");
	}
	const alternative = alternatives[0];
	if (!alternative) {
		if (queue && !queue.withdrawnAt) {
			await tx.salesRequestMailboxQueueProjection.update({
				where: { id: queue.id },
				data: {
					withdrawnAt: input.dbNow,
					status: "dismissed",
					statusRevision: queue.statusRevision + 1,
					statusUpdatedAt: input.dbNow,
				},
			});
		}
		return;
	}
	const [source, snapshot] = await Promise.all([
		Promise.resolve(sourceById.get(alternative.sourceId)),
		tx.salesRequestMailboxMessageSnapshot.findUnique({
			where: { id: alternative.snapshotId },
		}),
	]);
	if (
		!source ||
		buildMailboxSourceMembershipIdentity({
			connectionId: input.connectionId,
			sourceKey: source.sourceKey,
			providerMessageId: input.providerMessageId,
			summaryRevision: alternative.summaryRevision,
		}) !== alternative.id ||
		!snapshot ||
		snapshot.connectionId !== input.connectionId ||
		snapshot.provider !== input.provider ||
		snapshot.providerMessageId !== input.providerMessageId ||
		snapshot.providerMessageIdentityHash !== input.identityHash ||
		snapshot.expiresAt.getTime() <= input.dbNow.getTime()
	) {
		throw new Error("mailbox-current-projection-corrupt");
	}
	const queueIdentity = buildMailboxQueueIdentity({
		connectionId: input.connectionId,
		providerMessageId: input.providerMessageId,
		contentHash: snapshot.contentHash,
	});
	if (!queue) return;
	const preserveStatus = queue.queueIdentity === queueIdentity;
	await tx.salesRequestMailboxQueueProjection.update({
		where: { id: queue.id },
		data: {
			queueIdentity,
			snapshotId: snapshot.id,
			sourceMembershipId: alternative.id,
			sourceKey: source.sourceKey,
			sourceSummaryRevision: alternative.summaryRevision,
			snapshotSchemaVersion: snapshot.schemaVersion,
			contentHash: snapshot.contentHash,
			status: preserveStatus ? queue.status : "new",
			statusRevision: preserveStatus
				? queue.statusRevision
				: queue.statusRevision + 1,
			statusUpdatedAt: preserveStatus ? queue.statusUpdatedAt : input.dbNow,
			failureCode: preserveStatus ? queue.failureCode : null,
			receivedAt: snapshot.receivedAt,
			fromEmail: snapshot.fromEmail,
			fromName: snapshot.fromName,
			subject: snapshot.subject,
			hasAttachments: snapshot.hasAttachments,
			withdrawnAt: null,
		},
	});
}

/** Global connection+message lease and immutable snapshot/queue projection store. */
export function createPrismaSalesRequestMailboxMessageDetailStore(
	db: Database,
	dependencies: SalesRequestMailboxContentStoreDependencies,
): MailboxMessageDetailStore {
	type DetailMutationInput = {
		runId: string;
		leaseScope: {
			kind: "connection-provider-message";
			connectionId: string;
			providerMessageId: string;
		};
		connectionId: string;
		source: MailboxSyncSource;
		providerMessageId: string;
		expectedSummaryRevision: number;
		sourceMembershipIdentity: string;
		leaseFence: { leaseId: string; epoch: number; expiresAt: Date };
		authorityFence: {
			organizationId: number;
			ownerUserId: number;
			provider: "gmail" | "microsoft-graph";
			connectionRevision: number;
			policyRevision: number;
			ownerActive: boolean;
			connectionActive: boolean;
		};
		retentionFence: { policyRevision: number; retentionDays: number };
	};

	async function mutate(
		input: DetailMutationInput,
		apply: (
			tx: TransactionClient,
			state: {
				lease: NonNullable<
					Awaited<
						ReturnType<
							TransactionClient["salesRequestMailboxMessageLease"]["findFirst"]
						>
					>
				>;
				connection: MailboxConnectionRow;
				source: NonNullable<
					Awaited<
						ReturnType<
							TransactionClient["salesRequestMailboxSource"]["findFirst"]
						>
					>
				>;
				summary: NonNullable<
					Awaited<
						ReturnType<
							TransactionClient["salesRequestMailboxMessageSummary"]["findFirst"]
						>
					>
				>;
				dbNow: Date;
			},
			// biome-ignore lint/suspicious/noConfusingVoidType: successful callbacks may only mutate.
		) => Promise<MailboxSyncMutationResult | void>,
		options: { allowInactiveOwner?: boolean } = {},
	): Promise<MailboxSyncMutationResult> {
		const result = await db.$transaction(
			async (tx) => {
				const dbNow = await databaseNow(tx);
				const identityHash = hashMailboxProviderMessageIdentity(
					input.authorityFence.provider,
					input.providerMessageId,
				);
				await lockMessageLease(tx, input.connectionId, identityHash);
				const lease = await tx.salesRequestMailboxMessageLease.findFirst({
					where: {
						connectionId: input.connectionId,
						providerMessageIdentityHash: identityHash,
					},
				});
				if (
					!lease ||
					lease.providerMessageId !== input.providerMessageId ||
					!leaseFenceMatches(lease, input, dbNow)
				) {
					return { kind: "lease-lost" } as const;
				}
				const [connection, source, summary] = await Promise.all([
					tx.salesRequestMailboxConnection.findUnique({
						where: { id: input.connectionId },
					}),
					tx.salesRequestMailboxSource.findUnique({
						where: { id: lease.sourceId },
					}),
					tx.salesRequestMailboxMessageSummary.findUnique({
						where: { id: lease.claimedSummaryId ?? "" },
					}),
				]);
				if (
					!connection ||
					!source?.selected ||
					!summary?.active ||
					!sourceMatches(source, input.source) ||
					summary.connectionId !== input.connectionId ||
					summary.sourceId !== source.id ||
					summary.providerMessageId !== input.providerMessageId ||
					summary.summaryRevision !== input.expectedSummaryRevision ||
					lease.claimedSummaryRevision !== input.expectedSummaryRevision ||
					lease.sourceMembershipIdentity !== input.sourceMembershipIdentity ||
					!authorityFenceMatches(connection, input.authorityFence)
				) {
					return { kind: "authority-changed" } as const;
				}
				const authority = await dependencies.resolveAuthority(tx, connection);
				const policy = salesRequestMailboxPolicySchema.safeParse(
					authority.policy,
				);
				if (
					!authority.current ||
					authority.ownerActive !== input.authorityFence.ownerActive ||
					(!options.allowInactiveOwner && !authority.ownerActive) ||
					!policy.success ||
					policy.data.revision !== input.retentionFence.policyRevision ||
					policy.data.retentionDays !== input.retentionFence.retentionDays
				) {
					return { kind: "authority-changed" } as const;
				}
				const outcome = await apply(tx, {
					lease,
					connection,
					source,
					summary,
					dbNow,
				});
				return outcome ?? ({ kind: "applied" } as const);
			},
			{ maxWait: 5_000, timeout: 15_000 },
		);
		return result ?? { kind: "applied" };
	}

	return {
		async claimLease(input) {
			return db.$transaction(
				async (tx) => {
					const dbNow = await databaseNow(tx);
					const leaseExpiresAt = leaseExpiryFromDatabaseClock(input, dbNow);
					if (!leaseExpiresAt) return { kind: "contended" } as const;
					const source = await selectedSourceForInput(
						tx,
						input.leaseScope.connectionId,
						input.sourceMembership.source,
					);
					if (!source) return { kind: "not-found" } as const;
					const provider =
						input.sourceMembership.source.kind === "gmail-label"
							? "gmail"
							: "microsoft-graph";
					const identityHash = hashMailboxProviderMessageIdentity(
						provider,
						input.leaseScope.providerMessageId,
					);
					await lockMessageLease(
						tx,
						input.leaseScope.connectionId,
						identityHash,
					);
					const summary = await tx.salesRequestMailboxMessageSummary.findFirst({
						where: {
							connectionId: input.leaseScope.connectionId,
							sourceId: source.id,
							providerMessageIdentityHash: identityHash,
							summaryRevision: input.sourceMembership.expectedSummaryRevision,
							active: true,
							disposition: "accepted",
							detailStatus: { in: READY_DETAIL_STATUSES },
						},
					});
					if (!summary) {
						const current =
							await tx.salesRequestMailboxMessageSummary.findFirst({
								where: {
									connectionId: input.leaseScope.connectionId,
									providerMessageIdentityHash: identityHash,
									active: true,
								},
								select: {
									provider: true,
									providerMessageId: true,
									providerMessageIdentityHash: true,
									summaryRevision: true,
								},
							});
						if (
							current &&
							(current.provider !== provider ||
								current.providerMessageId !==
									input.leaseScope.providerMessageId ||
								current.providerMessageIdentityHash !== identityHash)
						) {
							throw new Error("mailbox-message-identity-collision");
						}
						return current?.summaryRevision !== undefined &&
							current.summaryRevision !==
								input.sourceMembership.expectedSummaryRevision
							? ({ kind: "stale-summary" } as const)
							: ({ kind: "not-found" } as const);
					}
					if (
						summary.providerMessageId !== input.leaseScope.providerMessageId
					) {
						return { kind: "not-found" } as const;
					}
					const [connection, allSources] = await Promise.all([
						tx.salesRequestMailboxConnection.findUnique({
							where: { id: input.leaseScope.connectionId },
						}),
						selectedConnectionSources(tx, input.leaseScope.connectionId),
					]);
					if (
						!connection ||
						!source.selected ||
						!sourceMatches(source, input.sourceMembership.source) ||
						connection.state !== "active" ||
						connection.syncBlocked
					) {
						return { kind: "not-found" } as const;
					}
					const existing = await tx.salesRequestMailboxMessageLease.findFirst({
						where: {
							connectionId: connection.id,
							providerMessageIdentityHash: identityHash,
						},
					});
					if (
						existing &&
						existing.providerMessageId !== input.leaseScope.providerMessageId
					) {
						throw new Error("mailbox-message-identity-collision");
					}
					if (
						existing &&
						(!READY_DETAIL_STATUSES.includes(existing.status) ||
							existing.nextAttemptAt.getTime() > dbNow.getTime())
					) {
						return { kind: "not-found" } as const;
					}
					if (
						existing?.leaseExpiresAt &&
						existing.leaseExpiresAt.getTime() > dbNow.getTime()
					) {
						return { kind: "contended" } as const;
					}
					const authority = await dependencies.resolveAuthority(tx, connection);
					const configuration = connectionConfiguration(connection, allSources);
					const tokens = connectionTokens(connection, dependencies);
					if (!authority.current || !configuration || !tokens) {
						return { kind: "not-found" } as const;
					}
					const membershipIdentity = buildMailboxSourceMembershipIdentity({
						connectionId: connection.id,
						sourceKey: input.sourceMembership.source.key,
						providerMessageId: summary.providerMessageId,
						summaryRevision: summary.summaryRevision,
					});
					const epoch = (existing?.leaseEpoch ?? 0) + 1;
					let lease = existing;
					if (existing) {
						const changed = await tx.salesRequestMailboxMessageLease.updateMany(
							{
								where: {
									id: existing.id,
									status: { in: READY_DETAIL_STATUSES },
									nextAttemptAt: { lte: dbNow },
									OR: [
										{ leaseExpiresAt: null },
										{ leaseExpiresAt: { lte: dbNow } },
									],
								},
								data: {
									sourceId: source.id,
									claimedSummaryId: summary.id,
									claimedSummaryRevision: summary.summaryRevision,
									sourceMembershipIdentity: membershipIdentity,
									status: "processing",
									runId: input.runId,
									leaseId: input.runId,
									leaseEpoch: epoch,
									leaseExpiresAt,
									leasedConnectionRevision: connection.revision,
									leasedPolicyRevision: connection.policyRevision,
								},
							},
						);
						if (changed.count !== 1) return { kind: "contended" } as const;
						lease = await tx.salesRequestMailboxMessageLease.findUnique({
							where: { id: existing.id },
						});
						if (!lease) return { kind: "contended" } as const;
					} else {
						lease = await tx.salesRequestMailboxMessageLease.create({
							data: {
								connectionId: connection.id,
								providerMessageId: summary.providerMessageId,
								providerMessageIdentityHash: identityHash,
								sourceId: source.id,
								claimedSummaryId: summary.id,
								claimedSummaryRevision: summary.summaryRevision,
								sourceMembershipIdentity: membershipIdentity,
								status: "processing",
								runId: input.runId,
								leaseId: input.runId,
								leaseEpoch: epoch,
								leaseExpiresAt,
								leasedConnectionRevision: connection.revision,
								leasedPolicyRevision: connection.policyRevision,
							},
						});
					}
					return {
						kind: "claimed",
						lease: {
							leaseScope: input.leaseScope,
							connectionId: connection.id,
							source: input.sourceMembership.source,
							providerMessageId: summary.providerMessageId,
							summaryRevision: summary.summaryRevision,
							leaseFence: {
								leaseId: lease.leaseId as string,
								epoch: lease.leaseEpoch,
								expiresAt: lease.leaseExpiresAt as Date,
							},
							authorityFence: {
								organizationId: connection.organizationId,
								ownerUserId: connection.ownerUserId,
								provider: connection.provider as "gmail" | "microsoft-graph",
								connectionRevision: connection.revision,
								policyRevision: connection.policyRevision,
								ownerActive: authority.ownerActive,
								connectionActive: true,
							},
							connection: configuration,
							policy: authority.policy,
							tokens,
							summary: {
								providerMessageId: summary.providerMessageId,
								providerThreadId: summary.providerThreadId ?? undefined,
								folderId: summary.providerFolderId ?? undefined,
								labelIds: jsonArray(summary.providerLabelIds) ?? [],
								fromEmail: summary.fromEmail,
								fromName: summary.fromName ?? undefined,
								subject: summary.subject ?? undefined,
								receivedAt: summary.receivedAt,
								hasAttachments: summary.hasAttachments,
								headers: summary.automationHeaders,
							},
							retryAttempts: lease.retryAttempts,
						},
					} as const;
				},
				{ maxWait: 5_000, timeout: 15_000 },
			);
		},

		async commitSnapshotAndQueue(input) {
			return mutate(input, async (tx, state) => {
				const identityHash = hashMailboxProviderMessageIdentity(
					input.snapshot.provider,
					input.snapshot.providerMessageId,
				);
				const expectedContentHash = buildMailboxMessageContentHash({
					providerThreadId: input.snapshot.providerThreadId,
					receivedAt: input.snapshot.receivedAt,
					fromEmail: input.snapshot.fromEmail,
					fromName: input.snapshot.fromName,
					subject: input.snapshot.subject,
					toEmails: input.snapshot.toEmails,
					ccEmails: input.snapshot.ccEmails,
					hasAttachments: input.snapshot.hasAttachments,
					displayText: input.snapshot.displayText,
					modelInput: input.snapshot.modelInput,
				});
				const expectedQueueIdentity = buildMailboxQueueIdentity({
					connectionId: input.connectionId,
					providerMessageId: input.providerMessageId,
					contentHash: input.snapshot.contentHash,
				});
				if (
					input.snapshot.providerMessageId !== input.providerMessageId ||
					input.snapshot.provider !== input.authorityFence.provider ||
					input.snapshot.contentHash !== expectedContentHash ||
					input.queueProjection.queueIdentity !== expectedQueueIdentity ||
					input.queueProjection.connectionId !== input.connectionId ||
					input.queueProjection.provider !== input.snapshot.provider ||
					input.queueProjection.contentHash !== input.snapshot.contentHash ||
					input.queueProjection.providerMessageId !== input.providerMessageId ||
					input.queueProjection.sourceKey !== input.source.key ||
					input.queueProjection.sourceSummaryRevision !==
						input.expectedSummaryRevision ||
					input.queueProjection.snapshotSchemaVersion !==
						input.snapshot.schemaVersion ||
					input.sourceMembership.sourceMembershipIdentity !==
						input.sourceMembershipIdentity ||
					input.sourceMembership.connectionId !== input.connectionId ||
					input.sourceMembership.provider !== input.snapshot.provider ||
					input.sourceMembership.sourceKey !== input.source.key ||
					input.sourceMembership.providerMessageId !==
						input.providerMessageId ||
					input.sourceMembership.summaryRevision !==
						input.expectedSummaryRevision ||
					input.queueProjection.sourceMembershipIdentity !==
						input.sourceMembershipIdentity ||
					input.snapshot.expiresAt.getTime() <= state.dbNow.getTime()
				) {
					throw new Error("invalid-mailbox-snapshot-projection");
				}
				let snapshot = await tx.salesRequestMailboxMessageSnapshot.findFirst({
					where: {
						connectionId: input.connectionId,
						providerMessageIdentityHash: identityHash,
						schemaVersion: input.snapshot.schemaVersion,
						contentHash: input.snapshot.contentHash,
					},
				});
				if (
					snapshot &&
					snapshot.providerMessageId !== input.providerMessageId
				) {
					throw new Error("mailbox-message-identity-collision");
				}
				if (snapshot && snapshot.expiresAt.getTime() <= state.dbNow.getTime()) {
					return { kind: "authority-changed" } as const;
				}
				if (!snapshot) {
					snapshot = await tx.salesRequestMailboxMessageSnapshot.create({
						data: {
							connectionId: input.connectionId,
							provider: input.snapshot.provider,
							providerMessageId: input.snapshot.providerMessageId,
							providerMessageIdentityHash: identityHash,
							providerThreadId: input.snapshot.providerThreadId,
							schemaVersion: input.snapshot.schemaVersion,
							contentHash: input.snapshot.contentHash,
							capturedAt: input.snapshot.capturedAt,
							receivedAt: input.snapshot.receivedAt,
							expiresAt: input.snapshot.expiresAt,
							fromEmail: input.snapshot.fromEmail,
							fromName: input.snapshot.fromName,
							subject: input.snapshot.subject,
							toEmails: [...input.snapshot.toEmails],
							ccEmails: [...input.snapshot.ccEmails],
							hasAttachments: input.snapshot.hasAttachments,
							displayText: input.snapshot.displayText,
							modelInput: input.snapshot.modelInput,
						},
					});
				}
				const activeKey = `${state.source.id}:${identityHash}`;
				await tx.salesRequestMailboxSourceMembership.updateMany({
					where: { activeKey, id: { not: input.sourceMembershipIdentity } },
					data: {
						activeKey: null,
						state: "inactive",
						deactivatedAt: state.dbNow,
						withdrawalReason: "superseded",
					},
				});
				const existingMembership =
					await tx.salesRequestMailboxSourceMembership.findUnique({
						where: { id: input.sourceMembershipIdentity },
					});
				if (
					existingMembership &&
					(existingMembership.connectionId !== input.connectionId ||
						existingMembership.sourceId !== state.source.id ||
						existingMembership.providerMessageId !== input.providerMessageId ||
						existingMembership.providerMessageIdentityHash !== identityHash ||
						existingMembership.summaryRevision !==
							input.expectedSummaryRevision)
				) {
					throw new Error("mailbox-membership-identity-collision");
				}
				if (existingMembership) {
					await tx.salesRequestMailboxSourceMembership.update({
						where: { id: existingMembership.id },
						data: {
							snapshotId: snapshot.id,
							state: "active",
							activeKey,
							deactivatedAt: null,
							withdrawalReason: null,
						},
					});
				} else {
					await tx.salesRequestMailboxSourceMembership.create({
						data: {
							id: input.sourceMembershipIdentity,
							connectionId: input.connectionId,
							sourceId: state.source.id,
							messageSummaryId: state.summary.id,
							snapshotId: snapshot.id,
							providerMessageId: input.providerMessageId,
							providerMessageIdentityHash: identityHash,
							summaryRevision: input.expectedSummaryRevision,
							state: "active",
							activeKey,
							activatedAt: state.dbNow,
						},
					});
				}
				const currentQueue =
					await tx.salesRequestMailboxQueueProjection.findFirst({
						where: {
							connectionId: input.connectionId,
							providerMessageIdentityHash: identityHash,
						},
					});
				if (
					currentQueue &&
					(currentQueue.provider !== input.snapshot.provider ||
						currentQueue.providerMessageId !== input.providerMessageId)
				) {
					throw new Error("mailbox-message-identity-collision");
				}
				const preserveStatus =
					currentQueue?.queueIdentity === input.queueProjection.queueIdentity;
				const queueData = {
					queueIdentity: input.queueProjection.queueIdentity,
					organizationId: state.connection.organizationId,
					ownerUserId: state.connection.ownerUserId,
					provider: input.snapshot.provider,
					providerMessageId: input.providerMessageId,
					providerMessageIdentityHash: identityHash,
					snapshotId: snapshot.id,
					sourceMembershipId: input.sourceMembershipIdentity,
					sourceKey: input.source.key,
					sourceSummaryRevision: input.expectedSummaryRevision,
					snapshotSchemaVersion: input.snapshot.schemaVersion,
					contentHash: input.snapshot.contentHash,
					status: preserveStatus ? currentQueue.status : "new",
					statusRevision: preserveStatus
						? currentQueue.statusRevision
						: (currentQueue?.statusRevision ?? 0) + 1,
					statusUpdatedAt: preserveStatus
						? currentQueue.statusUpdatedAt
						: state.dbNow,
					failureCode: preserveStatus ? currentQueue.failureCode : null,
					receivedAt: input.snapshot.receivedAt,
					fromEmail: input.snapshot.fromEmail,
					fromName: input.snapshot.fromName,
					subject: input.snapshot.subject,
					hasAttachments: input.snapshot.hasAttachments,
					withdrawnAt: null,
				};
				if (currentQueue) {
					await tx.salesRequestMailboxQueueProjection.update({
						where: { id: currentQueue.id },
						data: queueData,
					});
				} else {
					await tx.salesRequestMailboxQueueProjection.create({
						data: { ...queueData, connectionId: input.connectionId },
					});
				}
				await Promise.all([
					tx.salesRequestMailboxMessageLease.update({
						where: { id: state.lease.id },
						data: {
							status: "complete",
							completedAt: state.dbNow,
							leaseId: null,
							leaseExpiresAt: null,
						},
					}),
					tx.salesRequestMailboxMessageSummary.update({
						where: { id: state.summary.id },
						data: { detailStatus: "complete" },
					}),
				]);
			});
		},

		async withdrawCurrentProjection(input) {
			return mutate(
				input,
				async (tx, state) => {
					await tx.salesRequestMailboxSourceMembership.updateMany({
						where: {
							id: input.sourceMembershipIdentity,
							state: "active",
							summaryRevision: { lte: input.expectedSummaryRevision },
						},
						data: {
							state: "inactive",
							activeKey: null,
							deactivatedAt: state.dbNow,
							withdrawalReason: input.reason,
						},
					});
					const identityHash = hashMailboxProviderMessageIdentity(
						input.authorityFence.provider,
						input.providerMessageId,
					);
					await reconcileCurrentQueueProjection(tx, {
						connectionId: input.connectionId,
						provider: input.authorityFence.provider,
						providerMessageId: input.providerMessageId,
						identityHash,
						dbNow: state.dbNow,
					});
					await tx.salesRequestMailboxMessageLease.update({
						where: { id: state.lease.id },
						data: {
							status: "complete",
							completedAt: state.dbNow,
							leaseId: null,
							leaseExpiresAt: null,
						},
					});
					await tx.salesRequestMailboxMessageSummary.update({
						where: { id: state.summary.id },
						data: { detailStatus: "withdrawn" },
					});
				},
				{ allowInactiveOwner: input.reason === "owner-inactive" },
			);
		},

		async settleRetry(input) {
			return mutate(input, async (tx, state) => {
				await Promise.all([
					tx.salesRequestMailboxMessageLease.update({
						where: { id: state.lease.id },
						data: {
							status: "retry-pending",
							retryAttempts: input.retryAttempts,
							nextAttemptAt: new Date(
								state.dbNow.getTime() + input.retryAfterMs,
							),
							failureCode: input.evidence.code,
							failureEvidence: input.evidence,
							leaseId: null,
							leaseExpiresAt: null,
						},
					}),
					tx.salesRequestMailboxMessageSummary.update({
						where: { id: state.summary.id },
						data: { detailStatus: "retry-pending" },
					}),
				]);
			});
		},

		async settleReauthorization(input) {
			return mutate(input, async (tx, state) => {
				await Promise.all([
					tx.salesRequestMailboxMessageLease.update({
						where: { id: state.lease.id },
						data: {
							status: "reauthorization-required",
							failureCode: input.evidence.code,
							failureEvidence: input.evidence,
							leaseId: null,
							leaseExpiresAt: null,
						},
					}),
					tx.salesRequestMailboxMessageSummary.update({
						where: { id: state.summary.id },
						data: { detailStatus: "reauthorization-required" },
					}),
				]);
			});
		},

		async settleDeadLetter(input) {
			return mutate(input, async (tx, state) => {
				await Promise.all([
					tx.salesRequestMailboxMessageLease.update({
						where: { id: state.lease.id },
						data: {
							status: "dead-lettered",
							failureCode: input.reason,
							failureEvidence: input.evidence ?? Prisma.JsonNull,
							leaseId: null,
							leaseExpiresAt: null,
						},
					}),
					tx.salesRequestMailboxMessageSummary.update({
						where: { id: state.summary.id },
						data: { detailStatus: "dead-lettered" },
					}),
				]);
			});
		},
	};
}

/**
 * Provider-free retention adapter. The database clock and selected snapshot rows
 * are acquired under the same transaction; content is removed child-to-parent.
 */
export function createPrismaSalesRequestMailboxRetentionStore(db: Database) {
	return {
		async purgeExpiredMailboxData(input: { limit: number; behavior: unknown }) {
			if (
				!Number.isSafeInteger(input.limit) ||
				input.limit < 1 ||
				input.limit > 500
			) {
				throw new Error("invalid-mailbox-retention-limit");
			}
			return db.$transaction(
				async (tx) => {
					const locked = await tx.$queryRaw<LockedExpiredSnapshot[]>(
						Prisma.sql`SELECT id, connectionId, provider, providerMessageId,
							providerMessageIdentityHash,
							CURRENT_TIMESTAMP(3) AS dbNow
						FROM SalesRequestMailboxMessageSnapshot
						WHERE expiresAt <= CURRENT_TIMESTAMP(3)
						ORDER BY expiresAt ASC, id ASC
						LIMIT ${input.limit}
						FOR UPDATE`,
					);
					const dbNow =
						locked[0]?.dbNow ??
						(
							await tx.$queryRaw<Array<{ dbNow: Date }>>(
								Prisma.sql`SELECT CURRENT_TIMESTAMP(3) AS dbNow`,
							)
						)[0]?.dbNow;
					if (!(dbNow instanceof Date) || !Number.isFinite(dbNow.getTime())) {
						throw new Error("invalid-mailbox-retention-database-clock");
					}
					const snapshotIds = locked.map((row) => row.id);
					const identities = new Map<string, LockedExpiredSnapshot>();
					for (const row of locked) {
						if (
							hashMailboxProviderMessageIdentity(
								row.provider,
								row.providerMessageId,
							) !== row.providerMessageIdentityHash
						) {
							throw new Error("mailbox-retention-identity-corrupt");
						}
						const key = `${row.connectionId}\0${row.providerMessageIdentityHash}`;
						const existing = identities.get(key);
						if (
							existing &&
							(existing.provider !== row.provider ||
								existing.providerMessageId !== row.providerMessageId)
						) {
							throw new Error("mailbox-message-identity-collision");
						}
						identities.set(key, row);
					}
					const purgeIdentities: LockedExpiredSnapshot[] = [];
					for (const row of identities.values()) {
						const retained =
							await tx.salesRequestMailboxMessageSnapshot.findMany({
								where: {
									connectionId: row.connectionId,
									providerMessageIdentityHash: row.providerMessageIdentityHash,
									expiresAt: { gt: dbNow },
								},
								select: {
									provider: true,
									providerMessageId: true,
									providerMessageIdentityHash: true,
								},
							});
						for (const candidate of retained) {
							if (
								hashMailboxProviderMessageIdentity(
									candidate.provider,
									candidate.providerMessageId,
								) !== candidate.providerMessageIdentityHash
							) {
								throw new Error("mailbox-retention-identity-corrupt");
							}
						}
						if (
							!retained.some(
								(candidate) =>
									candidate.provider === row.provider &&
									candidate.providerMessageId === row.providerMessageId,
							)
						) {
							purgeIdentities.push(row);
						}
					}
					const queueIds: string[] = [];
					const membershipIds: string[] = [];
					const leaseIds: string[] = [];
					const summaryIds: string[] = [];
					for (const row of purgeIdentities) {
						const [queueRows, membershipRows, leaseRows, summaryRows] =
							await Promise.all([
								tx.salesRequestMailboxQueueProjection.findMany({
									where: {
										connectionId: row.connectionId,
										providerMessageIdentityHash:
											row.providerMessageIdentityHash,
									},
									select: { id: true, provider: true, providerMessageId: true },
								}),
								tx.salesRequestMailboxSourceMembership.findMany({
									where: {
										connectionId: row.connectionId,
										providerMessageIdentityHash:
											row.providerMessageIdentityHash,
									},
									select: { id: true, providerMessageId: true },
								}),
								tx.salesRequestMailboxMessageLease.findMany({
									where: {
										connectionId: row.connectionId,
										providerMessageIdentityHash:
											row.providerMessageIdentityHash,
									},
									select: { id: true, providerMessageId: true },
								}),
								tx.salesRequestMailboxMessageSummary.findMany({
									where: {
										connectionId: row.connectionId,
										providerMessageIdentityHash:
											row.providerMessageIdentityHash,
									},
									select: { id: true, provider: true, providerMessageId: true },
								}),
							]);
						if (
							queueRows.some(
								(candidate) =>
									candidate.provider !== row.provider ||
									candidate.providerMessageId !== row.providerMessageId,
							) ||
							membershipRows.some(
								(candidate) =>
									candidate.providerMessageId !== row.providerMessageId,
							) ||
							leaseRows.some(
								(candidate) =>
									candidate.providerMessageId !== row.providerMessageId,
							) ||
							summaryRows.some(
								(candidate) =>
									candidate.provider !== row.provider ||
									candidate.providerMessageId !== row.providerMessageId,
							)
						) {
							throw new Error("mailbox-message-identity-collision");
						}
						queueIds.push(...queueRows.map((candidate) => candidate.id));
						membershipIds.push(
							...membershipRows.map((candidate) => candidate.id),
						);
						leaseIds.push(...leaseRows.map((candidate) => candidate.id));
						summaryIds.push(...summaryRows.map((candidate) => candidate.id));
					}
					const queue = await tx.salesRequestMailboxQueueProjection.deleteMany({
						where: { id: { in: queueIds } },
					});
					const memberships =
						await tx.salesRequestMailboxSourceMembership.deleteMany({
							where: { id: { in: membershipIds } },
						});
					const leases = await tx.salesRequestMailboxMessageLease.deleteMany({
						where: { id: { in: leaseIds } },
					});
					const summaries =
						await tx.salesRequestMailboxMessageSummary.deleteMany({
							where: { id: { in: summaryIds } },
						});
					const snapshots =
						await tx.salesRequestMailboxMessageSnapshot.deleteMany({
							where: { id: { in: snapshotIds }, expiresAt: { lte: dbNow } },
						});

					const oauthCutoff = new Date(dbNow.getTime() - 24 * 60 * 60_000);
					const oauthRows = await tx.salesRequestMailboxOAuthAttempt.findMany({
						where: {
							OR: [
								{ terminalAt: { lte: oauthCutoff } },
								{ expiresAt: { lte: oauthCutoff } },
							],
						},
						select: { stateDigest: true },
						orderBy: [{ updatedAt: "asc" }, { stateDigest: "asc" }],
						take: input.limit,
					});
					const oauthAttempts =
						await tx.salesRequestMailboxOAuthAttempt.deleteMany({
							where: {
								stateDigest: {
									in: oauthRows.map((row) => row.stateDigest),
								},
							},
						});

					return {
						counts: {
							queueRows: queue.count,
							memberships: memberships.count,
							leases: leases.count,
							summaries: summaries.count,
							snapshots: snapshots.count,
							oauthAttempts: oauthAttempts.count,
						},
						hasMore:
							locked.length === input.limit || oauthRows.length === input.limit,
					};
				},
				{ maxWait: 5_000, timeout: 15_000 },
			);
		},
	};
}
