const DEFAULT_RETENTION_BATCH_SIZE = 200;
const MAX_RETENTION_BATCH_SIZE = 500;

export const MAILBOX_RETENTION_PURGE_BEHAVIOR = {
	clock: "database-current-time-only",
	snapshotSelection: "expired-snapshots-at-database-time",
	oauthAttemptSelection: "terminal-or-expired-for-24-hours-at-database-time",
	replay: "never-extend-existing-snapshot-expiry",
	transactionOrder: [
		"delete-current-queue-if-no-retained-snapshot",
		"delete-source-memberships-if-no-retained-snapshot",
		"delete-message-leases-if-no-retained-snapshot",
		"delete-message-summaries-if-no-retained-snapshot",
		"delete-selected-expired-snapshots",
		"delete-selected-terminal-or-expired-oauth-attempts",
	] as const,
	preserveContentFreeConnectionAudit: true,
} as const;

export type MailboxRetentionPurgeCounts = Readonly<{
	queueRows: number;
	memberships: number;
	leases: number;
	summaries: number;
	snapshots: number;
	oauthAttempts: number;
}>;

export interface MailboxRetentionCleanupStore {
	/**
	 * Executes one bounded transaction using only database current time as its
	 * cutoff. It must lock the selected snapshot identities, apply the declared
	 * child-to-parent order, and never update or extend retained snapshot expiry.
	 */
	purgeExpiredMailboxData(input: {
		limit: number;
		behavior: typeof MAILBOX_RETENTION_PURGE_BEHAVIOR;
	}): Promise<{
		counts: MailboxRetentionPurgeCounts;
		hasMore: boolean;
	}>;
}

function validCount(value: number) {
	return Number.isSafeInteger(value) && value >= 0;
}

function validCounts(value: unknown): value is MailboxRetentionPurgeCounts {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const counts = value as Record<string, unknown>;
	const keys = [
		"queueRows",
		"memberships",
		"leases",
		"summaries",
		"snapshots",
		"oauthAttempts",
	] as const;
	return (
		Object.keys(counts).length === keys.length &&
		keys.every((key) => validCount(counts[key] as number))
	);
}

/** Runs one bounded, provider-free retention batch. Continuation is job-owned. */
export async function purgeExpiredMailboxContent(
	input: {
		limit?: number;
		signal?: AbortSignal;
	},
	store: MailboxRetentionCleanupStore,
) {
	const limit = input.limit ?? DEFAULT_RETENTION_BATCH_SIZE;
	if (
		!Number.isSafeInteger(limit) ||
		limit < 1 ||
		limit > MAX_RETENTION_BATCH_SIZE
	) {
		throw new Error("invalid-mailbox-retention-limit");
	}
	input.signal?.throwIfAborted();
	const result = await store.purgeExpiredMailboxData({
		limit,
		behavior: MAILBOX_RETENTION_PURGE_BEHAVIOR,
	});
	input.signal?.throwIfAborted();
	if (typeof result?.hasMore !== "boolean" || !validCounts(result.counts)) {
		throw new Error("invalid-mailbox-retention-result");
	}
	return result;
}
