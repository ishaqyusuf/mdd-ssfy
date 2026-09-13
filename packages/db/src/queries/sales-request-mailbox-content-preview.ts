import {
	buildMailboxQueueIdentity,
	buildMailboxSourceMembershipIdentity,
	salesRequestMailboxPolicySchema,
} from "@gnd/sales-request-mailbox";
import { Prisma } from "../index";
import type { Database } from "../index";
import type { SalesRequestMailboxContentAuthorityResolver } from "./sales-request-mailbox-content-stores";
import {
	hashMailboxProviderMessageIdentity,
	hashMailboxProviderSourceIdentity,
	hashMailboxSourceKey,
} from "./sales-request-mailbox-identities";

const QUEUE_IDENTITY = /^srq[1-9][0-9]*:[a-f0-9]{64}$/;
const PREVIEWABLE_STATUSES = new Set(["new", "needs-review", "failed"]);

export type PrismaSalesRequestMailboxPreviewSourceResolverDependencies = {
	resolveAuthority: SalesRequestMailboxContentAuthorityResolver;
};

/**
 * Resolves the only mailbox content path allowed to cross into AI generation.
 * Every invocation rechecks current ownership, office, policy, queue, membership,
 * snapshot identity, retention and exact case-sensitive provider identity.
 */
export function createPrismaSalesRequestMailboxPreviewSourceResolver(
	db: Database,
	dependencies: PrismaSalesRequestMailboxPreviewSourceResolverDependencies,
) {
	return async function resolveAuthorizedQueue(input: {
		actorUserId: number;
		queueIdentity: string;
		type: "order" | "quote";
		signal: AbortSignal;
	}) {
		if (
			!Number.isSafeInteger(input.actorUserId) ||
			input.actorUserId < 1 ||
			!QUEUE_IDENTITY.test(input.queueIdentity) ||
			(input.type !== "order" && input.type !== "quote")
		) {
			throw new Error("invalid-mailbox-preview-source-request");
		}
		input.signal.throwIfAborted();
		return db.$transaction(
			async (tx) => {
				const queue = await tx.salesRequestMailboxQueueProjection.findUnique({
					where: { queueIdentity: input.queueIdentity },
				});
				if (!queue) return { kind: "not-found" } as const;
				if (queue.ownerUserId !== input.actorUserId) {
					return { kind: "forbidden" } as const;
				}
				if (queue.withdrawnAt || !PREVIEWABLE_STATUSES.has(queue.status)) {
					return { kind: "not-ready" } as const;
				}
				const connection = await tx.salesRequestMailboxConnection.findUnique({
					where: { id: queue.connectionId },
				});
				if (
					!connection ||
					connection.state !== "active" ||
					connection.syncBlocked ||
					connection.ownerUserId !== input.actorUserId ||
					connection.organizationId !== queue.organizationId ||
					connection.provider !== queue.provider
				) {
					return { kind: "stale" } as const;
				}
				const authority = await dependencies.resolveAuthority(tx, connection);
				const policy = salesRequestMailboxPolicySchema.safeParse(
					authority.policy,
				);
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
					return { kind: "forbidden" } as const;
				}
				const [membership, snapshot, clock] = await Promise.all([
					tx.salesRequestMailboxSourceMembership.findUnique({
						where: { id: queue.sourceMembershipId },
					}),
					tx.salesRequestMailboxMessageSnapshot.findUnique({
						where: { id: queue.snapshotId },
					}),
					tx.$queryRaw<Array<{ dbNow: Date }>>(
						Prisma.sql`SELECT CURRENT_TIMESTAMP(3) AS dbNow`,
					),
				]);
				const dbNow = clock[0]?.dbNow;
				const [source, summary] = membership
					? await Promise.all([
							tx.salesRequestMailboxSource.findUnique({
								where: { id: membership.sourceId },
							}),
							tx.salesRequestMailboxMessageSummary.findUnique({
								where: { id: membership.messageSummaryId },
							}),
						])
					: [null, null];
				const messageHash = hashMailboxProviderMessageIdentity(
					queue.provider,
					queue.providerMessageId,
				);
				const expectedQueueIdentity = buildMailboxQueueIdentity({
					connectionId: queue.connectionId,
					providerMessageId: queue.providerMessageId,
					contentHash: queue.contentHash,
				});
				const expectedMembershipIdentity = buildMailboxSourceMembershipIdentity(
					{
						connectionId: queue.connectionId,
						sourceKey: queue.sourceKey,
						providerMessageId: queue.providerMessageId,
						summaryRevision: queue.sourceSummaryRevision,
					},
				);
				if (
					!(dbNow instanceof Date) ||
					!Number.isFinite(dbNow.getTime()) ||
					!membership ||
					membership.state !== "active" ||
					!membership.activeKey ||
					membership.connectionId !== connection.id ||
					membership.id !== expectedMembershipIdentity ||
					membership.id !== queue.sourceMembershipId ||
					membership.snapshotId !== queue.snapshotId ||
					membership.providerMessageId !== queue.providerMessageId ||
					membership.providerMessageIdentityHash !== messageHash ||
					membership.summaryRevision !== queue.sourceSummaryRevision ||
					!source ||
					!source.selected ||
					source.connectionId !== connection.id ||
					source.sourceKey !== queue.sourceKey ||
					hashMailboxSourceKey(source.sourceKey) !==
						source.sourceKeyIdentityHash ||
					hashMailboxProviderSourceIdentity(
						source.kind,
						source.providerSourceId,
					) !== source.providerSourceIdentityHash ||
					(connection.provider === "gmail") !==
						(source.kind === "gmail-label") ||
					!summary ||
					!summary.active ||
					summary.id !== membership.messageSummaryId ||
					summary.connectionId !== connection.id ||
					summary.sourceId !== source.id ||
					summary.provider !== queue.provider ||
					summary.providerMessageId !== queue.providerMessageId ||
					summary.providerMessageIdentityHash !== messageHash ||
					summary.summaryRevision !== queue.sourceSummaryRevision ||
					!snapshot ||
					snapshot.connectionId !== connection.id ||
					snapshot.provider !== queue.provider ||
					snapshot.providerMessageId !== queue.providerMessageId ||
					snapshot.providerMessageIdentityHash !== messageHash ||
					snapshot.contentHash !== queue.contentHash ||
					snapshot.expiresAt.getTime() <= dbNow.getTime() ||
					queue.providerMessageIdentityHash !== messageHash ||
					queue.queueIdentity !== expectedQueueIdentity
				) {
					return { kind: "stale" } as const;
				}
				input.signal.throwIfAborted();
				return {
					kind: "authorized",
					modelInput: snapshot.modelInput,
					identity: {
						queueIdentity: queue.queueIdentity,
						snapshotIdentity: snapshot.id,
						contentHash: snapshot.contentHash,
					},
				} as const;
			},
			{ maxWait: 5_000, timeout: 15_000 },
		);
	};
}
