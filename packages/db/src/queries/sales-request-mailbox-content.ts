import {
	DEFAULT_MAILBOX_INBOX_STATUS_COUNTS,
	MAILBOX_QUEUE_STATUSES,
	buildMailboxQueueIdentity,
	issueMailboxInboxCursor,
	mailboxInboxPageRequestSchema,
	projectMailboxInboxDetail,
	projectMailboxInboxPage,
	readMailboxInboxCursor,
	salesRequestMailboxPolicySchema,
} from "@gnd/sales-request-mailbox";
import type {
	MailboxInboxKeyset,
	MailboxInboxPageRequest,
	MailboxInboxPageResult,
	MailboxQueueStatus,
	MailboxSyncSource,
} from "@gnd/sales-request-mailbox";
import { Prisma } from "../index";
import type { Database, TransactionClient } from "../index";
import type { SalesRequestMailboxContentAuthorityResolver } from "./sales-request-mailbox-content-stores";
import {
	hashMailboxProviderMessageIdentity,
	hashMailboxProviderSourceIdentity,
	hashMailboxSourceKey,
} from "./sales-request-mailbox-identities";

function validDate(value: Date) {
	return value instanceof Date && Number.isFinite(value.getTime());
}

function toSyncSource(source: {
	kind: string;
	providerSourceId: string;
	sourceKey: string;
	providerSourceIdentityHash?: string;
	sourceKeyIdentityHash?: string;
}): MailboxSyncSource | null {
	const expectedKind = source.kind;
	if (
		!source.providerSourceIdentityHash ||
		!source.sourceKeyIdentityHash ||
		hashMailboxProviderSourceIdentity(expectedKind, source.providerSourceId) !==
			source.providerSourceIdentityHash ||
		hashMailboxSourceKey(source.sourceKey) !== source.sourceKeyIdentityHash
	) {
		return null;
	}
	if (
		expectedKind === "gmail-label" &&
		source.sourceKey === `gmail:label:${source.providerSourceId}`
	) {
		return {
			kind: "gmail-label",
			labelId: source.providerSourceId,
			key: source.sourceKey,
		};
	}
	if (
		expectedKind === "graph-folder" &&
		source.sourceKey === `graph:folder:${source.providerSourceId}`
	) {
		return {
			kind: "graph-folder",
			folderId: source.providerSourceId,
			key: source.sourceKey,
		};
	}
	return null;
}

export function createPrismaSalesRequestMailboxJobWorkStore(db: Database) {
	return {
		async resolveSyncWork(input: { workId: string }) {
			const stream = await db.salesRequestMailboxSyncStream.findUnique({
				where: { id: input.workId },
				select: {
					connectionId: true,
					sourceId: true,
					status: true,
				},
			});
			if (!stream) {
				return { kind: "not-found" } as const;
			}
			const [connection, source] = await Promise.all([
				db.salesRequestMailboxConnection.findUnique({
					where: { id: stream.connectionId },
					select: { id: true, provider: true },
				}),
				db.salesRequestMailboxSource.findUnique({
					where: { id: stream.sourceId },
					select: {
						id: true,
						connectionId: true,
						kind: true,
						providerSourceId: true,
						providerSourceIdentityHash: true,
						sourceKey: true,
						sourceKeyIdentityHash: true,
						selected: true,
					},
				}),
			]);
			const resolved = source ? toSyncSource(source) : null;
			if (
				!connection ||
				source?.connectionId !== connection.id ||
				!resolved ||
				(connection.provider === "gmail") !== (resolved.kind === "gmail-label")
			) {
				return { kind: "not-found" } as const;
			}
			return {
				kind: "ready",
				work: { connectionId: connection.id, source: resolved },
			} as const;
		},

		async resolveMessageDetailWork(input: { workId: string }) {
			const summary = await db.salesRequestMailboxMessageSummary.findUnique({
				where: { id: input.workId },
				select: {
					id: true,
					connectionId: true,
					sourceId: true,
					provider: true,
					providerMessageId: true,
					providerMessageIdentityHash: true,
					summaryRevision: true,
					active: true,
					detailStatus: true,
					disposition: true,
				},
			});
			if (
				!summary ||
				hashMailboxProviderMessageIdentity(
					summary.provider,
					summary.providerMessageId,
				) !== summary.providerMessageIdentityHash
			) {
				return { kind: "not-found" } as const;
			}
			const [source, connection] = await Promise.all([
				db.salesRequestMailboxSource.findUnique({
					where: { id: summary.sourceId },
					select: {
						id: true,
						connectionId: true,
						kind: true,
						providerSourceId: true,
						providerSourceIdentityHash: true,
						sourceKey: true,
						sourceKeyIdentityHash: true,
						selected: true,
					},
				}),
				db.salesRequestMailboxConnection.findUnique({
					where: { id: summary.connectionId },
					select: { id: true, provider: true },
				}),
			]);
			const resolved = source ? toSyncSource(source) : null;
			if (
				!connection ||
				source?.connectionId !== summary.connectionId ||
				!resolved ||
				connection.provider !== summary.provider ||
				(summary.provider === "gmail") !== (resolved.kind === "gmail-label")
			) {
				return { kind: "not-found" } as const;
			}
			return {
				kind: "ready",
				work: {
					connectionId: summary.connectionId,
					source: resolved,
					providerMessageId: summary.providerMessageId,
					expectedSummaryRevision: summary.summaryRevision,
				},
			} as const;
		},

		async resolveTokenHealthWork(input: { workId: string }) {
			const connection = await db.salesRequestMailboxConnection.findFirst({
				where: {
					healthOperationId: input.workId,
					state: "active",
				},
				select: {
					id: true,
					revision: true,
					healthOperationConnectionRevision: true,
					healthOperationReason: true,
				},
			});
			if (
				!connection ||
				connection.healthOperationConnectionRevision !== connection.revision ||
				(connection.healthOperationReason !== "token-expiring" &&
					connection.healthOperationReason !== "forced-health-check")
			) {
				return { kind: "not-found" } as const;
			}
			return {
				kind: "ready",
				work: {
					connectionId: connection.id,
					expectedConnectionRevision: connection.revision,
					reason: connection.healthOperationReason,
				},
			} as const;
		},

		async resolveDisconnectWork(input: { workId: string }) {
			const connection = await db.salesRequestMailboxConnection.findFirst({
				where: { disconnectId: input.workId, state: "disconnecting" },
				select: {
					id: true,
					ownerUserId: true,
					disconnectPreviousRevision: true,
					disconnectCompletedAt: true,
				},
			});
			if (
				!connection ||
				connection.disconnectCompletedAt ||
				connection.disconnectPreviousRevision === null
			) {
				return { kind: "not-found" } as const;
			}
			return {
				kind: "ready",
				work: {
					actorUserId: connection.ownerUserId,
					connectionId: connection.id,
					expectedConnectionRevision: connection.disconnectPreviousRevision,
				},
			} as const;
		},
	};
}

export type SalesRequestMailboxInboxListInput = {
	actorUserId: number;
	organizationId: number;
	connectionId: string;
	request: MailboxInboxPageRequest;
	now?: Date;
};

function requireInboxActor(input: SalesRequestMailboxInboxListInput) {
	if (
		!Number.isSafeInteger(input.actorUserId) ||
		input.actorUserId < 1 ||
		!Number.isSafeInteger(input.organizationId) ||
		input.organizationId < 1 ||
		!input.connectionId.trim() ||
		input.connectionId.length > 255 ||
		(input.now !== undefined && !validDate(input.now))
	) {
		throw new Error("mailbox-inbox-invalid-request");
	}
}

function pageWhere(input: {
	ownerUserId: number;
	organizationId: number;
	connectionId: string;
	status?: MailboxQueueStatus;
	search?: string;
	keyset: MailboxInboxKeyset | null;
}) {
	const where: Prisma.SalesRequestMailboxQueueProjectionWhereInput = {
		ownerUserId: input.ownerUserId,
		organizationId: input.organizationId,
		connectionId: input.connectionId,
		withdrawnAt: null,
	};
	if (input.status) where.status = input.status;
	if (input.search) {
		where.OR = [
			{ fromEmail: { contains: input.search } },
			{ fromName: { contains: input.search } },
			{ subject: { contains: input.search } },
		];
	}
	if (input.keyset) {
		const keyset = input.keyset;
		const keysetClause: Prisma.SalesRequestMailboxQueueProjectionWhereInput = {
			OR: [
				{ receivedAt: { lt: keyset.receivedAt } },
				{
					receivedAt: keyset.receivedAt,
					queueIdentity: { lt: keyset.queueIdentity },
				},
			],
		};
		where.AND = [keysetClause];
	}
	return where;
}

export function createPrismaSalesRequestMailboxInboxReader(
	db: Database,
	cursorKey: Uint8Array,
	dependencies: {
		resolveAuthority: SalesRequestMailboxContentAuthorityResolver;
	},
) {
	async function connectionForOwner(input: {
		tx: TransactionClient;
		actorUserId: number;
		organizationId: number;
		connectionId: string;
	}) {
		const connection = await input.tx.salesRequestMailboxConnection.findFirst({
			where: {
				id: input.connectionId,
				ownerUserId: input.actorUserId,
				organizationId: input.organizationId,
				state: "active",
			},
		});
		if (
			!connection ||
			connection.id !== input.connectionId ||
			connection.ownerUserId !== input.actorUserId ||
			connection.organizationId !== input.organizationId ||
			connection.state !== "active" ||
			connection.syncBlocked
		) {
			throw new Error("mailbox-inbox-unavailable");
		}
		const authority = await dependencies.resolveAuthority(input.tx, connection);
		const policy = salesRequestMailboxPolicySchema.safeParse(authority.policy);
		if (
			!authority.current ||
			!authority.ownerActive ||
			!policy.success ||
			!policy.data.enabled ||
			policy.data.emergencyDisabled ||
			policy.data.revision !== connection.policyRevision ||
			!policy.data.eligibleUserIds.includes(input.actorUserId) ||
			!policy.data.supportedProviders.includes(
				connection.provider as "gmail" | "microsoft-graph",
			)
		) {
			throw new Error("mailbox-inbox-unavailable");
		}
		return connection;
	}

	return {
		async list(
			input: SalesRequestMailboxInboxListInput,
		): Promise<MailboxInboxPageResult> {
			requireInboxActor(input);
			const request = mailboxInboxPageRequestSchema.parse(input.request);
			const now = input.now ?? new Date();
			return db.$transaction(
				async (tx) => {
					const connection = await connectionForOwner({ ...input, tx });
					const scope = {
						ownerUserId: connection.ownerUserId,
						organizationId: connection.organizationId,
						connectionId: connection.id,
						connectionRevision: connection.revision,
						authorityRevision: connection.authorityRevision,
						status: request.status,
						search: request.search,
					};
					const keyset = request.cursor
						? readMailboxInboxCursor({
								key: cursorKey,
								scope,
								cursor: request.cursor,
								now,
							})
						: null;
					if (request.cursor && !keyset) {
						throw new Error("mailbox-inbox-cursor-invalid");
					}
					const base = {
						ownerUserId: connection.ownerUserId,
						organizationId: connection.organizationId,
						connectionId: connection.id,
					};
					const [rows, grouped] = await Promise.all([
						tx.salesRequestMailboxQueueProjection.findMany({
							where: pageWhere({
								...base,
								status: request.status,
								search: request.search,
								keyset,
							}),
							select: {
								queueIdentity: true,
								status: true,
								receivedAt: true,
								fromEmail: true,
								fromName: true,
								subject: true,
								hasAttachments: true,
							},
							orderBy: [{ receivedAt: "desc" }, { queueIdentity: "desc" }],
							take: request.limit + 1,
						}),
						tx.salesRequestMailboxQueueProjection.groupBy({
							by: ["status"],
							where: { ...base, withdrawnAt: null },
							_count: { _all: true },
						}),
					]);
					const hasMore = rows.length > request.limit;
					const items = rows.slice(0, request.limit);
					const counts = { ...DEFAULT_MAILBOX_INBOX_STATUS_COUNTS };
					for (const row of grouped) {
						if (
							(MAILBOX_QUEUE_STATUSES as readonly string[]).includes(row.status)
						) {
							counts[row.status as MailboxQueueStatus] = row._count._all;
						}
					}
					const tail = hasMore ? items.at(-1) : null;
					const nextCursor = tail
						? issueMailboxInboxCursor({
								key: cursorKey,
								scope,
								keyset: {
									receivedAt: tail.receivedAt,
									queueIdentity: tail.queueIdentity,
								},
								now,
							})
						: null;
					return projectMailboxInboxPage({
						items,
						nextCursor,
						statusCounts: counts,
					});
				},
				{ maxWait: 5_000, timeout: 15_000 },
			);
		},

		async detail(input: {
			actorUserId: number;
			organizationId: number;
			connectionId: string;
			queueIdentity: string;
		}) {
			return db.$transaction(
				async (tx) => {
					await connectionForOwner({ ...input, tx });
					const queue = await tx.salesRequestMailboxQueueProjection.findFirst({
						where: {
							queueIdentity: input.queueIdentity,
							connectionId: input.connectionId,
							ownerUserId: input.actorUserId,
							organizationId: input.organizationId,
							withdrawnAt: null,
						},
						select: {
							queueIdentity: true,
							status: true,
							receivedAt: true,
							fromEmail: true,
							fromName: true,
							subject: true,
							hasAttachments: true,
							snapshotId: true,
							provider: true,
							providerMessageId: true,
							providerMessageIdentityHash: true,
							contentHash: true,
						},
					});
					if (!queue) throw new Error("mailbox-inbox-item-unavailable");
					const expectedQueueIdentity = buildMailboxQueueIdentity({
						connectionId: input.connectionId,
						providerMessageId: queue.providerMessageId,
						contentHash: queue.contentHash,
					});
					if (
						expectedQueueIdentity !== queue.queueIdentity ||
						hashMailboxProviderMessageIdentity(
							queue.provider,
							queue.providerMessageId,
						) !== queue.providerMessageIdentityHash
					) {
						throw new Error("mailbox-inbox-item-unavailable");
					}
					const [snapshot, clock] = await Promise.all([
						tx.salesRequestMailboxMessageSnapshot.findUnique({
							where: { id: queue.snapshotId },
							select: {
								connectionId: true,
								provider: true,
								providerMessageId: true,
								providerMessageIdentityHash: true,
								contentHash: true,
								displayText: true,
								toEmails: true,
								ccEmails: true,
								expiresAt: true,
							},
						}),
						tx.$queryRaw<Array<{ dbNow: Date }>>(
							Prisma.sql`SELECT CURRENT_TIMESTAMP(3) AS dbNow`,
						),
					]);
					const dbNow = clock[0]?.dbNow;
					if (
						!(dbNow instanceof Date) ||
						!Number.isFinite(dbNow.getTime()) ||
						!snapshot ||
						snapshot.connectionId !== input.connectionId ||
						snapshot.provider !== queue.provider ||
						snapshot.providerMessageId !== queue.providerMessageId ||
						snapshot.providerMessageIdentityHash !==
							queue.providerMessageIdentityHash ||
						snapshot.contentHash !== queue.contentHash ||
						snapshot.expiresAt.getTime() <= dbNow.getTime()
					) {
						throw new Error("mailbox-inbox-item-unavailable");
					}
					return projectMailboxInboxDetail({
						...queue,
						displayText: snapshot.displayText,
						toEmails: snapshot.toEmails,
						ccEmails: snapshot.ccEmails,
					});
				},
				{ maxWait: 5_000, timeout: 15_000 },
			);
		},
	};
}
