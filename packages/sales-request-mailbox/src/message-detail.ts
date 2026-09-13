import { createHash } from "node:crypto";
import type {
	MailboxMessageDetail,
	MailboxMessageSummary,
	MailboxTokenSet,
	SalesRequestMailboxAdapter,
} from "./adapter.js";
import {
	type MailboxConnectionConfiguration,
	type MailboxExclusionReason,
	type MailboxProvider,
	applyMailboxExclusions,
	buildMailboxQueueIdentity,
	mailboxAutomationHeadersSchema,
	mailboxConnectionConfigurationSchema,
	salesRequestMailboxPolicySchema,
} from "./contracts.js";
import {
	MailboxProviderError,
	mailboxProviderErrorEvidence,
	resolveMailboxRetry,
} from "./errors.js";
import {
	prepareMailboxDisplayText,
	prepareMailboxModelInput,
} from "./sanitization.js";
import {
	type MailboxSyncAuthorityFence,
	type MailboxSyncLeaseFence,
	type MailboxSyncMutationResult,
	type MailboxSyncSource,
	mailboxSyncSourceProvider,
	resolveMailboxSyncSources,
} from "./sync-orchestrator.js";

export const MAILBOX_MESSAGE_DETAIL_MAX_RETRY_ATTEMPTS = 5;
const DAY_MS = 24 * 60 * 60_000;
const MAX_IDENTIFIER_CHARS = 255;
const MAX_SUBJECT_CHARS = 998;
const MAX_RECIPIENTS = 100;

export type MailboxMessageDetailWorkInput = {
	runId: string;
	connectionId: string;
	source: MailboxSyncSource;
	providerMessageId: string;
	expectedSummaryRevision: number;
	now: Date;
	leaseDurationMs: number;
	clock?: () => Date;
};

/** One writer may fetch/project a provider message across all source memberships. */
export type MailboxMessageDetailLeaseScope = {
	kind: "connection-provider-message";
	connectionId: string;
	providerMessageId: string;
};

export type MailboxMessageDetailStoreLease = {
	leaseScope: MailboxMessageDetailLeaseScope;
	connectionId: string;
	source: MailboxSyncSource;
	providerMessageId: string;
	summaryRevision: number;
	leaseFence: MailboxSyncLeaseFence;
	authorityFence: MailboxSyncAuthorityFence;
	/** Persisted values are deliberately revalidated before provider access. */
	connection: unknown;
	policy: unknown;
	tokens: MailboxTokenSet;
	summary: unknown;
	retryAttempts: number;
};

export type MailboxMessageSnapshot = {
	schemaVersion: 1;
	provider: MailboxProvider;
	providerMessageId: string;
	providerThreadId: string | null;
	sourceSummaryRevision: number;
	capturedAt: Date;
	receivedAt: Date;
	expiresAt: Date;
	fromEmail: string;
	fromName: string | null;
	subject: string | null;
	toEmails: readonly string[];
	ccEmails: readonly string[];
	hasAttachments: boolean;
	displayText: string;
	modelInput: string;
	contentHash: string;
};

export type MailboxSourceMembershipProjection = {
	sourceMembershipIdentity: string;
	connectionId: string;
	provider: MailboxProvider;
	sourceKey: string;
	providerMessageId: string;
	summaryRevision: number;
	state: "active";
	revisionBehavior: "ignore-older-source-revision";
};

export type MailboxQueueProjection = {
	queueIdentity: string;
	connectionId: string;
	provider: MailboxProvider;
	sourceKey: string;
	providerMessageId: string;
	sourceSummaryRevision: number;
	sourceMembershipIdentity: string;
	contentHash: string;
	snapshotSchemaVersion: 1;
	initialStatus: "new";
	sameIdentityBehavior: "preserve-status";
	contentChangeBehavior: "supersede-current-under-global-message-lease";
	sourceRevisionBehavior: "ignore-older-source-revision";
};

export type MailboxMessageDetailSuppressionReason =
	| "policy-disabled"
	| "emergency-disabled"
	| "provider-not-allowed"
	| "owner-not-eligible"
	| "owner-inactive"
	| "connection-inactive"
	| "source-not-configured"
	| "retention-expired"
	| "empty-content"
	| MailboxExclusionReason;

export type MailboxMessageDetailWithdrawalReason =
	| MailboxMessageDetailSuppressionReason
	| "provider-not-found";

type MailboxMessageDetailLeaseContext = {
	runId: string;
	leaseScope: MailboxMessageDetailLeaseScope;
	connectionId: string;
	source: MailboxSyncSource;
	providerMessageId: string;
	expectedSummaryRevision: number;
	sourceMembershipIdentity: string;
	leaseFence: MailboxSyncLeaseFence;
	authorityFence: MailboxSyncAuthorityFence;
	retentionFence: {
		policyRevision: number;
		retentionDays: number;
	};
};

/**
 * Persistence owns leases and atomicity. Every mutation must validate the exact
 * connection/source/message/summary-revision membership, globally exclusive
 * connection+provider-message lease scope, lease id/epoch/expiry, and all authority
 * fields in the same transaction. Source is membership context and must never be
 * part of the lease uniqueness key. It must also compare the current
 * policy revision and retention days to retentionFence; a retention shrink is an
 * authority change and may never allow a stale content write.
 *
 * commitSnapshotAndQueue atomically upserts sourceMembership by its exact
 * connection/source/message/revision identity and is idempotent by queueIdentity.
 * An older revision for one source may never regress that source's membership;
 * revisions from different sources are never globally comparable. Existing global
 * queue identity preserves workflow status. Under the global message lease, a hash
 * change supersedes current content while retaining immutable snapshots.
 * Withdrawal deactivates only the exact source membership revision and withdraws
 * the global current item only if no active selected memberships remain.
 */
export interface MailboxMessageDetailStore {
	claimLease(input: {
		runId: string;
		leaseScope: MailboxMessageDetailLeaseScope;
		sourceMembership: {
			source: MailboxSyncSource;
			expectedSummaryRevision: number;
		};
		now: Date;
		leaseExpiresAt: Date;
	}): Promise<
		| { kind: "claimed"; lease: MailboxMessageDetailStoreLease }
		| { kind: "contended" | "not-found" | "stale-summary" }
	>;
	commitSnapshotAndQueue(
		input: MailboxMessageDetailLeaseContext & {
			snapshot: MailboxMessageSnapshot;
			sourceMembership: MailboxSourceMembershipProjection;
			queueProjection: MailboxQueueProjection;
		},
	): Promise<MailboxSyncMutationResult>;
	withdrawCurrentProjection(
		input: MailboxMessageDetailLeaseContext & {
			reason: MailboxMessageDetailWithdrawalReason;
			membershipWithdrawalBehavior: "deactivate-source-revision-ignore-if-stale";
			queueWithdrawalBehavior: "withdraw-global-if-no-active-selected-memberships";
			evidence?: ReturnType<typeof mailboxProviderErrorEvidence>;
		},
	): Promise<MailboxSyncMutationResult>;
	settleRetry(
		input: MailboxMessageDetailLeaseContext & {
			retryAttempts: number;
			retryAfterMs: number;
			evidence: ReturnType<typeof mailboxProviderErrorEvidence>;
		},
	): Promise<MailboxSyncMutationResult>;
	settleReauthorization(
		input: MailboxMessageDetailLeaseContext & {
			evidence: ReturnType<typeof mailboxProviderErrorEvidence>;
		},
	): Promise<MailboxSyncMutationResult>;
	settleDeadLetter(
		input: MailboxMessageDetailLeaseContext & {
			reason: string;
			evidence?: ReturnType<typeof mailboxProviderErrorEvidence>;
		},
	): Promise<MailboxSyncMutationResult>;
}

export type MailboxMessageDetailDependencies = {
	store: MailboxMessageDetailStore;
	adapters: Readonly<
		Partial<Record<MailboxProvider, SalesRequestMailboxAdapter>>
	>;
};

export type MailboxMessageDetailRunResult =
	| { kind: "contended" | "not-found" | "stale-summary" }
	| { kind: "suppressed"; reason: MailboxMessageDetailSuppressionReason }
	| { kind: "withdrawn"; reason: "provider-not-found" }
	| {
			kind: "projected";
			sourceSummaryRevision: number;
			contentHash: string;
			queueIdentity: string;
	  }
	| { kind: "retry-pending"; retryAfterMs: number }
	| { kind: "reauthorization-required" }
	| { kind: "dead-lettered"; reason: string }
	| { kind: "lease-lost" | "authority-changed" };

type CanonicalMailboxMessageContent = Pick<
	MailboxMessageSnapshot,
	| "providerThreadId"
	| "receivedAt"
	| "fromEmail"
	| "fromName"
	| "subject"
	| "toEmails"
	| "ccEmails"
	| "hasAttachments"
	| "displayText"
	| "modelInput"
>;

/** Hashes only the versioned normalized content shape, never capture/expiry time,
 * source folder/labels, provider payloads, tokens, or attachment bytes. */
export function buildMailboxMessageContentHash(
	input: CanonicalMailboxMessageContent,
) {
	const canonical = JSON.stringify({
		providerThreadId: input.providerThreadId,
		receivedAt: input.receivedAt.toISOString(),
		fromEmail: input.fromEmail,
		fromName: input.fromName,
		subject: input.subject,
		toEmails: input.toEmails,
		ccEmails: input.ccEmails,
		hasAttachments: input.hasAttachments,
		displayText: input.displayText,
		modelInput: input.modelInput,
	});
	return `msc1:${createHash("sha256")
		.update("gnd:sales-request-mailbox-content:v1\0")
		.update(canonical)
		.digest("hex")}`;
}

export function buildMailboxSourceMembershipIdentity(input: {
	connectionId: string;
	sourceKey: string;
	providerMessageId: string;
	summaryRevision: number;
}) {
	if (
		!validIdentifier(input.connectionId) ||
		!validIdentifier(input.sourceKey) ||
		!validIdentifier(input.providerMessageId) ||
		!Number.isSafeInteger(input.summaryRevision) ||
		input.summaryRevision < 1
	) {
		throw new Error("invalid-mailbox-source-membership-identity");
	}
	const digest = createHash("sha256")
		.update("gnd:sales-request-mailbox-source-membership:v1\0")
		.update(input.connectionId)
		.update("\0")
		.update(input.sourceKey)
		.update("\0")
		.update(input.providerMessageId)
		.update("\0")
		.update(String(input.summaryRevision))
		.digest("hex");
	return `msm1:${digest}`;
}

function validIdentifier(value: unknown): value is string {
	return (
		typeof value === "string" &&
		value.trim().length > 0 &&
		value.length <= MAX_IDENTIFIER_CHARS
	);
}

function validateSource(source: MailboxSyncSource) {
	const sourceId =
		source.kind === "gmail-label" ? source.labelId : source.folderId;
	if (
		!validIdentifier(sourceId) ||
		!validIdentifier(source.key) ||
		(source.kind === "gmail-label" &&
			source.key !== `gmail:label:${sourceId}`) ||
		(source.kind === "graph-folder" &&
			source.key !== `graph:folder:${sourceId}`)
	) {
		throw new Error("invalid-mailbox-detail-source");
	}
}

function validateRunInput(input: MailboxMessageDetailWorkInput) {
	if (
		!validIdentifier(input.runId) ||
		!validIdentifier(input.connectionId) ||
		!validIdentifier(input.providerMessageId) ||
		!Number.isSafeInteger(input.expectedSummaryRevision) ||
		input.expectedSummaryRevision < 1 ||
		!(input.now instanceof Date) ||
		Number.isNaN(input.now.getTime()) ||
		!Number.isSafeInteger(input.leaseDurationMs) ||
		input.leaseDurationMs < 1_000 ||
		input.leaseDurationMs > 15 * 60_000 ||
		(input.clock !== undefined && typeof input.clock !== "function")
	) {
		throw new Error("invalid-mailbox-detail-run");
	}
	validateSource(input.source);
}

function sameSource(left: MailboxSyncSource, right: MailboxSyncSource) {
	return left.kind === right.kind && left.key === right.key;
}

function validateLeaseFence(
	fence: MailboxSyncLeaseFence,
	claimedAt: Date,
	requestedExpiresAt: Date,
) {
	if (
		!validIdentifier(fence.leaseId) ||
		!Number.isSafeInteger(fence.epoch) ||
		fence.epoch < 1 ||
		!(fence.expiresAt instanceof Date) ||
		Number.isNaN(fence.expiresAt.getTime()) ||
		fence.expiresAt.getTime() <= claimedAt.getTime() ||
		fence.expiresAt.getTime() > requestedExpiresAt.getTime()
	) {
		throw new Error("invalid-mailbox-detail-lease-fence");
	}
}

function validateAuthorityFence(fence: MailboxSyncAuthorityFence) {
	if (
		!Number.isSafeInteger(fence.organizationId) ||
		fence.organizationId < 1 ||
		!Number.isSafeInteger(fence.ownerUserId) ||
		fence.ownerUserId < 1 ||
		!(fence.provider === "gmail" || fence.provider === "microsoft-graph") ||
		!Number.isSafeInteger(fence.connectionRevision) ||
		fence.connectionRevision < 0 ||
		!Number.isSafeInteger(fence.policyRevision) ||
		fence.policyRevision < 0 ||
		typeof fence.ownerActive !== "boolean" ||
		typeof fence.connectionActive !== "boolean"
	) {
		throw new Error("invalid-mailbox-detail-authority-fence");
	}
}

function cleanMetadata(value: string, max: number) {
	return Array.from(value)
		.filter((character) => {
			const code = character.codePointAt(0) ?? 0;
			return character === "\t" || code >= 32;
		})
		.join("")
		.trim()
		.slice(0, max);
}

function optionalText(value: unknown, max: number) {
	if (value == null) return undefined;
	if (typeof value !== "string" || value.length > max) {
		throw new Error("invalid-message-metadata");
	}
	const normalized = cleanMetadata(value, max);
	return normalized || undefined;
}

function email(value: unknown) {
	const normalized = optionalText(value, 320)?.toLowerCase();
	if (
		!normalized ||
		normalized.includes(" ") ||
		normalized.startsWith("@") ||
		normalized.endsWith("@") ||
		normalized.split("@").length !== 2
	) {
		throw new Error("invalid-message-email");
	}
	return normalized;
}

function emails(value: unknown) {
	if (!Array.isArray(value) || value.length > MAX_RECIPIENTS) {
		throw new Error("invalid-message-recipients");
	}
	return [...new Set(value.map(email))].sort();
}

function date(value: unknown) {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		throw new Error("invalid-message-date");
	}
	return new Date(value);
}

function identifiers(value: unknown) {
	if (
		!Array.isArray(value) ||
		value.length > MAX_RECIPIENTS ||
		value.some((item) => !validIdentifier(item))
	) {
		throw new Error("invalid-message-identifiers");
	}
	return [...new Set(value as string[])].sort();
}

function normalizeSummary(value: unknown): MailboxMessageSummary {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("invalid-message-summary");
	}
	const item = value as Record<string, unknown>;
	if (!validIdentifier(item.providerMessageId)) {
		throw new Error("invalid-message-summary");
	}
	const parsedHeaders = mailboxAutomationHeadersSchema.safeParse(item.headers);
	if (!parsedHeaders.success || typeof item.hasAttachments !== "boolean") {
		throw new Error("invalid-message-summary");
	}
	return {
		providerMessageId: item.providerMessageId,
		providerThreadId: optionalText(item.providerThreadId, MAX_IDENTIFIER_CHARS),
		folderId: optionalText(item.folderId, MAX_IDENTIFIER_CHARS),
		labelIds: identifiers(item.labelIds),
		fromEmail: email(item.fromEmail),
		fromName: optionalText(item.fromName, MAX_IDENTIFIER_CHARS),
		subject: optionalText(item.subject, MAX_SUBJECT_CHARS),
		receivedAt: date(item.receivedAt),
		hasAttachments: item.hasAttachments,
		headers: parsedHeaders.data,
	};
}

function normalizeDetail(value: unknown): MailboxMessageDetail {
	const normalized = normalizeSummary(value);
	const item = value as Record<string, unknown>;
	if (
		(item.textBody != null && typeof item.textBody !== "string") ||
		(item.htmlBody != null && typeof item.htmlBody !== "string")
	) {
		throw new Error("invalid-message-body");
	}
	return {
		...normalized,
		textBody: item.textBody as string | undefined,
		htmlBody: item.htmlBody as string | undefined,
		toEmails: emails(item.toEmails),
		ccEmails: emails(item.ccEmails),
	};
}

function summaryMatchesClaimedSource(
	summary: MailboxMessageSummary,
	source: MailboxSyncSource,
	connection: MailboxConnectionConfiguration,
) {
	if (source.kind === "gmail-label") {
		return summary.labelIds.includes(source.labelId);
	}
	if (connection.folderIds.length === 0 && source.folderId === "inbox") {
		return summary.folderId != null;
	}
	return summary.folderId === source.folderId;
}

function detailStillInClaimedSource(
	detail: MailboxMessageDetail,
	summary: MailboxMessageSummary,
	source: MailboxSyncSource,
) {
	return source.kind === "gmail-label"
		? detail.labelIds.includes(source.labelId)
		: detail.folderId != null && detail.folderId === summary.folderId;
}

function expiry(receivedAt: Date, capturedAt: Date, retentionDays: number) {
	return new Date(
		Math.min(receivedAt.getTime(), capturedAt.getTime()) +
			retentionDays * DAY_MS,
	);
}

function fencedResult(result: MailboxSyncMutationResult) {
	return result.kind === "applied" ? null : ({ kind: result.kind } as const);
}

/**
 * Fetches and projects one exact summary revision. No attachment, AI, customer,
 * Sales, document, payment, inventory, Production, or provider-write dependency is
 * present at this boundary.
 */
export async function runMailboxMessageDetail(
	input: MailboxMessageDetailWorkInput,
	dependencies: MailboxMessageDetailDependencies,
): Promise<MailboxMessageDetailRunResult> {
	validateRunInput(input);
	const requestedExpiresAt = new Date(
		input.now.getTime() + input.leaseDurationMs,
	);
	const leaseScope: MailboxMessageDetailLeaseScope = {
		kind: "connection-provider-message",
		connectionId: input.connectionId,
		providerMessageId: input.providerMessageId,
	};
	const claimed = await dependencies.store.claimLease({
		runId: input.runId,
		leaseScope,
		sourceMembership: {
			source: input.source,
			expectedSummaryRevision: input.expectedSummaryRevision,
		},
		now: input.now,
		leaseExpiresAt: requestedExpiresAt,
	});
	if (claimed.kind !== "claimed") return { kind: claimed.kind };
	const { lease } = claimed;
	if (
		lease.leaseScope.kind !== leaseScope.kind ||
		lease.leaseScope.connectionId !== leaseScope.connectionId ||
		lease.leaseScope.providerMessageId !== leaseScope.providerMessageId ||
		lease.connectionId !== input.connectionId ||
		lease.providerMessageId !== input.providerMessageId ||
		!sameSource(lease.source, input.source)
	) {
		throw new Error("mailbox-detail-lease-scope-mismatch");
	}
	if (lease.summaryRevision !== input.expectedSummaryRevision) {
		throw new Error("mailbox-detail-summary-revision-mismatch");
	}
	validateSource(lease.source);
	validateLeaseFence(lease.leaseFence, input.now, requestedExpiresAt);
	validateAuthorityFence(lease.authorityFence);
	if (
		!Number.isSafeInteger(lease.retryAttempts) ||
		lease.retryAttempts < 0 ||
		lease.retryAttempts > MAILBOX_MESSAGE_DETAIL_MAX_RETRY_ATTEMPTS
	) {
		throw new Error("invalid-mailbox-detail-retry-attempts");
	}
	if (
		!lease.tokens ||
		typeof lease.tokens.accessToken !== "string" ||
		!lease.tokens.accessToken.trim() ||
		!Array.isArray(lease.tokens.grantedScopes)
	) {
		throw new Error("invalid-mailbox-detail-tokens");
	}

	const parsedPolicy = salesRequestMailboxPolicySchema.safeParse(lease.policy);
	if (!parsedPolicy.success) throw new Error("invalid-mailbox-detail-policy");
	const policy = parsedPolicy.data;
	const parsedConnection = mailboxConnectionConfigurationSchema.safeParse(
		lease.connection,
	);
	if (!parsedConnection.success) {
		throw new Error("invalid-mailbox-detail-connection");
	}
	const connection = parsedConnection.data;
	if (
		lease.authorityFence.organizationId !== connection.organizationId ||
		lease.authorityFence.ownerUserId !== connection.ownerUserId ||
		lease.authorityFence.provider !== connection.provider ||
		lease.authorityFence.policyRevision !== policy.revision ||
		mailboxSyncSourceProvider(input.source) !== connection.provider
	) {
		throw new Error("mailbox-detail-authority-scope-mismatch");
	}

	let configuredSources: readonly MailboxSyncSource[];
	try {
		configuredSources = resolveMailboxSyncSources(connection);
	} catch {
		throw new Error("invalid-mailbox-detail-connection");
	}
	const sourceConfigured = configuredSources.some((source) =>
		sameSource(source, input.source),
	);

	const normalizedSummary = normalizeSummary(lease.summary);
	if (normalizedSummary.providerMessageId !== input.providerMessageId) {
		throw new Error("mailbox-detail-summary-identity-mismatch");
	}
	if (
		!summaryMatchesClaimedSource(normalizedSummary, input.source, connection)
	) {
		throw new Error("mailbox-detail-summary-source-mismatch");
	}
	const sourceMembershipIdentity = buildMailboxSourceMembershipIdentity({
		connectionId: input.connectionId,
		sourceKey: input.source.key,
		providerMessageId: input.providerMessageId,
		summaryRevision: input.expectedSummaryRevision,
	});

	const context: MailboxMessageDetailLeaseContext = {
		runId: input.runId,
		leaseScope,
		connectionId: input.connectionId,
		source: input.source,
		providerMessageId: input.providerMessageId,
		expectedSummaryRevision: input.expectedSummaryRevision,
		sourceMembershipIdentity,
		leaseFence: lease.leaseFence,
		authorityFence: lease.authorityFence,
		retentionFence: {
			policyRevision: policy.revision,
			retentionDays: policy.retentionDays,
		},
	};
	const clock = input.clock ?? (() => new Date());
	const leaseAlive = () => {
		const value = clock();
		if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
			throw new Error("invalid-mailbox-detail-clock");
		}
		return value.getTime() < lease.leaseFence.expiresAt.getTime();
	};
	const withdraw = async (
		reason: MailboxMessageDetailWithdrawalReason,
		evidence?: ReturnType<typeof mailboxProviderErrorEvidence>,
	): Promise<MailboxMessageDetailRunResult> => {
		if (!leaseAlive()) return { kind: "lease-lost" };
		const fenced = fencedResult(
			await dependencies.store.withdrawCurrentProjection({
				...context,
				reason,
				membershipWithdrawalBehavior:
					"deactivate-source-revision-ignore-if-stale",
				queueWithdrawalBehavior:
					"withdraw-global-if-no-active-selected-memberships",
				...(evidence ? { evidence } : {}),
			}),
		);
		if (fenced) return fenced;
		return reason === "provider-not-found"
			? { kind: "withdrawn", reason }
			: { kind: "suppressed", reason };
	};

	let suppression: MailboxMessageDetailSuppressionReason | null = null;
	if (!sourceConfigured) suppression = "source-not-configured";
	else if (!policy.enabled) suppression = "policy-disabled";
	else if (policy.emergencyDisabled) suppression = "emergency-disabled";
	else if (!lease.authorityFence.ownerActive) suppression = "owner-inactive";
	else if (!lease.authorityFence.connectionActive) {
		suppression = "connection-inactive";
	} else if (!policy.supportedProviders.includes(connection.provider)) {
		suppression = "provider-not-allowed";
	} else if (!policy.eligibleUserIds.includes(connection.ownerUserId)) {
		suppression = "owner-not-eligible";
	}
	if (suppression) return withdraw(suppression);

	const summaryDisposition = applyMailboxExclusions(
		normalizedSummary,
		connection,
	);
	if (!summaryDisposition.accepted) {
		return withdraw(summaryDisposition.reason);
	}
	if (
		expiry(
			normalizedSummary.receivedAt,
			input.now,
			policy.retentionDays,
		).getTime() <= input.now.getTime()
	) {
		return withdraw("retention-expired");
	}
	const adapter = dependencies.adapters[connection.provider];
	if (!adapter || adapter.provider !== connection.provider) {
		throw new Error("mailbox-detail-adapter-unavailable");
	}
	if (!leaseAlive()) return { kind: "lease-lost" };

	let rawDetail: MailboxMessageDetail;
	try {
		rawDetail = await adapter.getMessage({
			tokens: lease.tokens,
			providerMessageId: input.providerMessageId,
		});
	} catch (error) {
		if (!(error instanceof MailboxProviderError)) throw error;
		if (error.provider !== connection.provider) throw error;
		const evidence = mailboxProviderErrorEvidence(error);
		if (error.code === "not-found") {
			return withdraw("provider-not-found", evidence);
		}
		if (!leaseAlive()) return { kind: "lease-lost" };
		if (error.requiresReauthorization) {
			const fenced = fencedResult(
				await dependencies.store.settleReauthorization({
					...context,
					evidence,
				}),
			);
			return fenced ?? { kind: "reauthorization-required" };
		}
		if (
			error.code === "cursor-invalid" ||
			error.code === "malformed-response" ||
			error.code === "account-mismatch"
		) {
			const fenced = fencedResult(
				await dependencies.store.settleDeadLetter({
					...context,
					reason: error.code,
					evidence,
				}),
			);
			return fenced ?? { kind: "dead-lettered", reason: error.code };
		}
		const retry = resolveMailboxRetry(error, {
			attempt: lease.retryAttempts,
			maxAttempts: MAILBOX_MESSAGE_DETAIL_MAX_RETRY_ATTEMPTS,
		});
		if (retry.action === "retry") {
			const fenced = fencedResult(
				await dependencies.store.settleRetry({
					...context,
					retryAttempts: lease.retryAttempts + 1,
					retryAfterMs: retry.retryAfterMs,
					evidence,
				}),
			);
			return (
				fenced ?? {
					kind: "retry-pending",
					retryAfterMs: retry.retryAfterMs,
				}
			);
		}
		const reason = "retry-exhausted";
		const fenced = fencedResult(
			await dependencies.store.settleDeadLetter({
				...context,
				reason,
				evidence,
			}),
		);
		return fenced ?? { kind: "dead-lettered", reason };
	}

	let normalizedDetail: MailboxMessageDetail;
	try {
		normalizedDetail = normalizeDetail(rawDetail);
		if (
			normalizedDetail.providerMessageId !== input.providerMessageId ||
			(normalizedSummary.providerThreadId != null &&
				normalizedDetail.providerThreadId !==
					normalizedSummary.providerThreadId)
		) {
			throw new Error("detail-identity-mismatch");
		}
	} catch {
		const malformed = new MailboxProviderError({
			provider: connection.provider,
			code: "malformed-response",
		});
		if (!leaseAlive()) return { kind: "lease-lost" };
		const fenced = fencedResult(
			await dependencies.store.settleDeadLetter({
				...context,
				reason: "malformed-response",
				evidence: mailboxProviderErrorEvidence(malformed),
			}),
		);
		return fenced ?? { kind: "dead-lettered", reason: "malformed-response" };
	}

	const disposition = applyMailboxExclusions(normalizedDetail, connection);
	if (!disposition.accepted) return withdraw(disposition.reason);
	if (
		!detailStillInClaimedSource(
			normalizedDetail,
			normalizedSummary,
			input.source,
		)
	) {
		return withdraw("folder-not-selected");
	}
	const expiresAt = expiry(
		normalizedDetail.receivedAt,
		input.now,
		policy.retentionDays,
	);
	if (expiresAt.getTime() <= input.now.getTime()) {
		return withdraw("retention-expired");
	}

	const displayText = prepareMailboxDisplayText({
		text: normalizedDetail.textBody,
		html: normalizedDetail.htmlBody,
	});
	let modelInput: string;
	try {
		modelInput = prepareMailboxModelInput({
			text: normalizedDetail.textBody,
			html: normalizedDetail.htmlBody,
		});
	} catch {
		return withdraw("empty-content");
	}
	const content = {
		providerThreadId: normalizedDetail.providerThreadId ?? null,
		receivedAt: normalizedDetail.receivedAt,
		fromEmail: normalizedDetail.fromEmail,
		fromName: normalizedDetail.fromName ?? null,
		subject: normalizedDetail.subject ?? null,
		toEmails: normalizedDetail.toEmails,
		ccEmails: normalizedDetail.ccEmails,
		hasAttachments: normalizedDetail.hasAttachments,
		displayText,
		modelInput,
	};
	const contentHash = buildMailboxMessageContentHash(content);
	const queueIdentity = buildMailboxQueueIdentity({
		connectionId: input.connectionId,
		providerMessageId: input.providerMessageId,
		contentHash,
	});
	const snapshot: MailboxMessageSnapshot = {
		schemaVersion: 1,
		provider: connection.provider,
		providerMessageId: input.providerMessageId,
		providerThreadId: content.providerThreadId,
		sourceSummaryRevision: input.expectedSummaryRevision,
		capturedAt: input.now,
		receivedAt: content.receivedAt,
		expiresAt,
		fromEmail: content.fromEmail,
		fromName: content.fromName,
		subject: content.subject,
		toEmails: content.toEmails,
		ccEmails: content.ccEmails,
		hasAttachments: content.hasAttachments,
		displayText,
		modelInput,
		contentHash,
	};
	const sourceMembership: MailboxSourceMembershipProjection = {
		sourceMembershipIdentity,
		connectionId: input.connectionId,
		provider: connection.provider,
		sourceKey: input.source.key,
		providerMessageId: input.providerMessageId,
		summaryRevision: input.expectedSummaryRevision,
		state: "active",
		revisionBehavior: "ignore-older-source-revision",
	};
	const queueProjection: MailboxQueueProjection = {
		queueIdentity,
		connectionId: input.connectionId,
		provider: connection.provider,
		sourceKey: input.source.key,
		providerMessageId: input.providerMessageId,
		sourceSummaryRevision: input.expectedSummaryRevision,
		sourceMembershipIdentity,
		contentHash,
		snapshotSchemaVersion: 1,
		initialStatus: "new",
		sameIdentityBehavior: "preserve-status",
		contentChangeBehavior: "supersede-current-under-global-message-lease",
		sourceRevisionBehavior: "ignore-older-source-revision",
	};
	if (!leaseAlive()) return { kind: "lease-lost" };
	const fenced = fencedResult(
		await dependencies.store.commitSnapshotAndQueue({
			...context,
			snapshot,
			sourceMembership,
			queueProjection,
		}),
	);
	if (fenced) return fenced;
	return {
		kind: "projected",
		sourceSummaryRevision: input.expectedSummaryRevision,
		contentHash,
		queueIdentity,
	};
}
