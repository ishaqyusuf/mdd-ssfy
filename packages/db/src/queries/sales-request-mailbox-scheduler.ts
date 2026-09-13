import { randomUUID } from "node:crypto";
import { MAILBOX_TOKEN_REFRESH_BEFORE_EXPIRY_MS } from "@gnd/sales-request-mailbox";
import type { Database } from "../index";

export const SALES_REQUEST_MAILBOX_SCHEDULER_MAX_WORK = 500;

export type SalesRequestMailboxDueWork = {
	syncWorkIds: string[];
	detailWorkIds: string[];
	tokenHealthWorkIds: string[];
	disconnectWorkIds: string[];
};

export type SalesRequestMailboxSchedulerStoreOptions = {
	createHealthOperationId?: () => string;
};

const TRANSACTION_OPTIONS = {
	isolationLevel: "Serializable" as const,
	timeout: 10_000,
};

function requireSweepInput(input: { now: Date; limit: number }) {
	if (!(input.now instanceof Date) || !Number.isFinite(input.now.getTime())) {
		throw new Error("A valid scheduler time is required");
	}
	if (
		!Number.isSafeInteger(input.limit) ||
		input.limit < 1 ||
		input.limit > SALES_REQUEST_MAILBOX_SCHEDULER_MAX_WORK
	) {
		throw new Error("The scheduler work limit must be between 1 and 500");
	}
}

/**
 * Finds only opaque durable references. Trigger payloads must resolve and
 * reauthorize the current records again before doing provider or content work.
 */
export function createSalesRequestMailboxSchedulerStore(
	db: Database,
	options: SalesRequestMailboxSchedulerStoreOptions = {},
) {
	return {
		async findDueWork(input: {
			now: Date;
			limit: number;
		}): Promise<SalesRequestMailboxDueWork> {
			requireSweepInput(input);
			const refreshCutoff = new Date(
				input.now.getTime() + MAILBOX_TOKEN_REFRESH_BEFORE_EXPIRY_MS,
			);
			await db.$transaction(async (tx) => {
				const candidates = await tx.salesRequestMailboxConnection.findMany({
					where: {
						state: "active",
						syncBlocked: false,
						healthStatus: "healthy",
						tokenExpiresAt: { not: null, lte: refreshCutoff },
					},
					select: {
						id: true,
						revision: true,
						healthOperationId: true,
						healthOperationConnectionRevision: true,
					},
					orderBy: [{ tokenExpiresAt: "asc" }, { id: "asc" }],
					take: input.limit,
				});
				for (const candidate of candidates) {
					if (
						candidate.healthOperationId !== null &&
						candidate.healthOperationConnectionRevision === candidate.revision
					) {
						continue;
					}
					const operationId =
						options.createHealthOperationId?.() ?? randomUUID();
					await tx.salesRequestMailboxConnection.updateMany({
						where: {
							id: candidate.id,
							revision: candidate.revision,
							state: "active",
							syncBlocked: false,
							healthStatus: "healthy",
							healthOperationId: candidate.healthOperationId,
							healthOperationConnectionRevision:
								candidate.healthOperationConnectionRevision,
						},
						data: {
							healthOperationId: operationId,
							healthOperationReason: "token-expiring",
							healthOperationConnectionRevision: candidate.revision,
							healthStatus: "queued",
							healthRetryAttempt: 0,
							healthNextAttemptAt: input.now,
						},
					});
				}
			}, TRANSACTION_OPTIONS);

			const [
				streams,
				queuedSummaries,
				retryLeases,
				healthConnections,
				disconnectingConnections,
			] = await Promise.all([
				db.salesRequestMailboxSyncStream.findMany({
					where: {
						OR: [
							{
								status: {
									in: ["queued", "continuation-pending", "retry-pending"],
								},
								nextAttemptAt: { lte: input.now },
							},
							{
								status: "processing",
								leaseExpiresAt: { lte: input.now },
							},
						],
					},
					select: { id: true },
					orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
					take: input.limit,
				}),
				db.salesRequestMailboxMessageSummary.findMany({
					where: {
						active: true,
						disposition: "accepted",
						detailStatus: "queued",
					},
					select: { id: true },
					orderBy: [{ projectedAt: "asc" }, { id: "asc" }],
					take: input.limit,
				}),
				db.salesRequestMailboxMessageLease.findMany({
					where: {
						claimedSummaryId: { not: null },
						OR: [
							{
								status: "retry-pending",
								nextAttemptAt: { lte: input.now },
							},
							{
								status: "processing",
								leaseExpiresAt: { lte: input.now },
							},
						],
					},
					select: { claimedSummaryId: true },
					orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
					take: input.limit,
				}),
				db.salesRequestMailboxConnection.findMany({
					where: {
						state: "active",
						healthOperationId: { not: null },
						OR: [
							{
								healthStatus: "queued",
								healthNextAttemptAt: { lte: input.now },
							},
							{
								healthStatus: "temporarily-unavailable",
								healthNextAttemptAt: { lte: input.now },
							},
							{
								healthStatus: "claimed",
								healthLeaseExpiresAt: { lte: input.now },
							},
						],
					},
					select: {
						healthOperationId: true,
						healthOperationConnectionRevision: true,
						revision: true,
					},
					orderBy: [{ healthNextAttemptAt: "asc" }, { id: "asc" }],
					take: input.limit,
				}),
				db.salesRequestMailboxConnection.findMany({
					where: {
						state: "disconnecting",
						disconnectId: { not: null },
						disconnectCompletedAt: null,
						disconnectPhase: {
							in: ["provider-revocation", "cleanup"],
						},
					},
					select: { disconnectId: true },
					orderBy: [{ disconnectStartedAt: "asc" }, { id: "asc" }],
					take: input.limit,
				}),
			]);

			const detailWorkIds = new Set(queuedSummaries.map((row) => row.id));
			for (const row of retryLeases) {
				if (row.claimedSummaryId) detailWorkIds.add(row.claimedSummaryId);
			}

			return {
				syncWorkIds: streams.map((row) => row.id),
				detailWorkIds: [...detailWorkIds].slice(0, input.limit),
				tokenHealthWorkIds: healthConnections.flatMap((row) =>
					row.healthOperationId &&
					row.healthOperationConnectionRevision === row.revision
						? [row.healthOperationId]
						: [],
				),
				disconnectWorkIds: disconnectingConnections.flatMap((row) =>
					row.disconnectId ? [row.disconnectId] : [],
				),
			};
		},
	};
}
