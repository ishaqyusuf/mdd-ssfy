import { createHash } from "node:crypto";
import type {
	MailboxMessageSummary,
	MailboxSyncPage,
	MailboxTokenSet,
	SalesRequestMailboxAdapter,
} from "./adapter.js";
import {
	type MailboxConnectionConfiguration,
	type MailboxExclusionReason,
	type MailboxProvider,
	applyMailboxExclusions,
	mailboxConnectionConfigurationSchema,
	salesRequestMailboxPolicySchema,
} from "./contracts.js";
import {
	DEFAULT_MAILBOX_SYNC_BUDGET,
	type MailboxSyncBudget,
	type MailboxSyncState,
	advanceMailboxSync,
	getMailboxSyncRequest,
} from "./cursor-recovery.js";
import {
	MailboxProviderError,
	mailboxProviderErrorEvidence,
} from "./errors.js";
import {
	MAILBOX_PROVIDER_DEADLINE_RESERVE_MS,
	MailboxProviderRequestAbort,
	runMailboxProviderRequest,
} from "./provider-request.js";

export type MailboxSyncSource =
	| { kind: "gmail-label"; labelId: string; key: string }
	| { kind: "graph-folder"; folderId: string; key: string };

/**
 * Expands one connection into independent provider streams. Cursors and leases are
 * scoped to these keys; a run processes exactly one returned source.
 */
export function resolveMailboxSyncSources(
	value: MailboxConnectionConfiguration,
): readonly MailboxSyncSource[] {
	const connection = mailboxConnectionConfigurationSchema.parse(value);
	if (
		(connection.provider === "gmail" && connection.folderIds.length > 0) ||
		(connection.provider === "microsoft-graph" &&
			connection.labelIds.length > 0)
	) {
		throw new Error("provider-irrelevant-source-selection");
	}

	if (connection.provider === "gmail") {
		const labelIds =
			connection.labelIds.length > 0 ? connection.labelIds : ["INBOX"];
		return [...new Set(labelIds)].sort().map((labelId) => ({
			kind: "gmail-label" as const,
			labelId,
			key: `gmail:label:${labelId}`,
		}));
	}

	const folderIds =
		connection.folderIds.length > 0 ? connection.folderIds : ["inbox"];
	return [...new Set(folderIds)].sort().map((folderId) => ({
		kind: "graph-folder" as const,
		folderId,
		key: `graph:folder:${folderId}`,
	}));
}

export function mailboxSyncSourceProvider(
	source: MailboxSyncSource,
): MailboxProvider {
	return source.kind === "gmail-label" ? "gmail" : "microsoft-graph";
}

export type MailboxSyncCheckpoint = {
	cursor: string | null;
	pageToken: string | null;
	mode: "incremental" | "recovery-full";
	since: Date;
	retryAttempts: number;
	cursorResets: number;
	continuationFingerprints: readonly string[];
};

export type MailboxSyncLeaseFence = {
	leaseId: string;
	epoch: number;
	expiresAt: Date;
};

export type MailboxSyncAuthorityFence = {
	organizationId: number;
	ownerUserId: number;
	provider: MailboxProvider;
	connectionRevision: number;
	policyRevision: number;
	ownerActive: boolean;
	connectionActive: boolean;
};

export type MailboxSyncMutationResult =
	| { kind: "applied" }
	| { kind: "lease-lost" }
	| { kind: "authority-changed" };

export type MailboxSyncStoreLease = {
	connectionId: string;
	leaseFence: MailboxSyncLeaseFence;
	authorityFence: MailboxSyncAuthorityFence;
	/** Persisted values are deliberately revalidated by the orchestrator. */
	connection: unknown;
	policy: unknown;
	tokens: MailboxTokenSet;
	checkpoint: MailboxSyncCheckpoint | null;
};

export type MailboxSyncSummaryProjection = {
	connectionId: string;
	provider: MailboxProvider;
	sourceKey: string;
	summary: MailboxMessageSummary;
	disposition:
		| { accepted: true }
		| { accepted: false; reason: MailboxExclusionReason };
};

export type MailboxSyncTombstoneProjection = {
	connectionId: string;
	provider: MailboxProvider;
	sourceKey: string;
	providerMessageId: string;
};

type MailboxSyncLeaseContext = {
	runId: string;
	connectionId: string;
	source: MailboxSyncSource;
	leaseFence: MailboxSyncLeaseFence;
	authorityFence: MailboxSyncAuthorityFence;
};

type MailboxSyncSettlement = MailboxSyncLeaseContext & {
	checkpoint: MailboxSyncCheckpoint;
	pagesFetched: number;
	messagesProjected: number;
	messagesSuppressed: number;
	tombstonesProjected: number;
};

/**
 * Persistence owns the lease and transactions. Every mutation must verify that the
 * exact lease id/epoch is active and unexpired and that every authority-fence field
 * still matches current records in the same transaction. Page commits atomically,
 * idempotently apply projections and compare-and-set the stream checkpoint. An
 * ambiguous storage failure is retried by reclaiming the stream, so callers must
 * permit the same provider page to be replayed. The concrete store, not this sync
 * runner, atomically assigns/increments a monotonic summaryRevision for each exact
 * connection+source+provider-message projection during commitPageAndCheckpoint.
 * A later detail claim verifies that persisted revision against its work input.
 */
export interface MailboxSyncStore {
	claimLease(input: {
		runId: string;
		connectionId: string;
		source: MailboxSyncSource;
		now: Date;
		leaseExpiresAt: Date;
	}): Promise<
		| { kind: "claimed"; lease: MailboxSyncStoreLease }
		| { kind: "contended" }
		| { kind: "not-found" }
	>;
	commitPageAndCheckpoint(
		input: MailboxSyncLeaseContext & {
			expectedCheckpoint: MailboxSyncCheckpoint | null;
			nextCheckpoint: MailboxSyncCheckpoint;
			summaries: readonly MailboxSyncSummaryProjection[];
			tombstones: readonly MailboxSyncTombstoneProjection[];
		},
	): Promise<MailboxSyncMutationResult>;
	checkpointCursorReset(
		input: MailboxSyncLeaseContext & {
			expectedCheckpoint: MailboxSyncCheckpoint | null;
			nextCheckpoint: MailboxSyncCheckpoint;
		},
	): Promise<MailboxSyncMutationResult>;
	settleSuppressed(
		input: MailboxSyncLeaseContext & {
			reason: MailboxSyncSuppressionReason;
		},
	): Promise<MailboxSyncMutationResult>;
	settleComplete(
		input: MailboxSyncSettlement,
	): Promise<MailboxSyncMutationResult>;
	settleContinuation(
		input: MailboxSyncSettlement,
	): Promise<MailboxSyncMutationResult>;
	settleRetry(
		input: MailboxSyncLeaseContext & {
			checkpoint: MailboxSyncCheckpoint;
			retryAfterMs: number;
			evidence: ReturnType<typeof mailboxProviderErrorEvidence>;
		},
	): Promise<MailboxSyncMutationResult>;
	settleReauthorization(
		input: MailboxSyncLeaseContext & {
			checkpoint: MailboxSyncCheckpoint;
			evidence: ReturnType<typeof mailboxProviderErrorEvidence>;
		},
	): Promise<MailboxSyncMutationResult>;
	settleDeadLetter(
		input: MailboxSyncLeaseContext & {
			checkpoint: MailboxSyncCheckpoint;
			reason: string;
			evidence?: ReturnType<typeof mailboxProviderErrorEvidence>;
		},
	): Promise<MailboxSyncMutationResult>;
}

export type MailboxSyncSuppressionReason =
	| "invalid-policy"
	| "policy-disabled"
	| "emergency-disabled"
	| "provider-not-allowed"
	| "owner-not-eligible"
	| "owner-inactive"
	| "connection-inactive"
	| "invalid-connection"
	| "source-not-configured";

export type MailboxSyncRunResult =
	| { kind: "cancelled" }
	| { kind: "contended" | "not-found" }
	| { kind: "suppressed"; reason: MailboxSyncSuppressionReason }
	| {
			kind: "complete" | "continuation-pending";
			pagesFetched: number;
			messagesProjected: number;
			messagesSuppressed: number;
			tombstonesProjected: number;
	  }
	| { kind: "retry-pending"; retryAfterMs: number }
	| { kind: "reauthorization-required" }
	| { kind: "dead-lettered"; reason: string }
	| { kind: "lease-lost" | "authority-changed" };

export type MailboxSyncDependencies = {
	store: MailboxSyncStore;
	adapters: Readonly<
		Partial<Record<MailboxProvider, SalesRequestMailboxAdapter>>
	>;
};

function validIdentifier(value: string) {
	return value.trim().length > 0 && value.length <= 255;
}

function validateRunInput(input: {
	runId: string;
	connectionId: string;
	source: MailboxSyncSource;
	now: Date;
	leaseDurationMs: number;
	clock?: () => Date;
	signal?: AbortSignal;
}) {
	if (
		!validIdentifier(input.runId) ||
		!validIdentifier(input.connectionId) ||
		!(input.now instanceof Date) ||
		Number.isNaN(input.now.getTime()) ||
		!Number.isSafeInteger(input.leaseDurationMs) ||
		input.leaseDurationMs < 1_000 ||
		input.leaseDurationMs > 15 * 60_000 ||
		(input.clock !== undefined && typeof input.clock !== "function")
	) {
		throw new Error("invalid-mailbox-sync-run");
	}
	const sourceId =
		input.source.kind === "gmail-label"
			? input.source.labelId
			: input.source.folderId;
	if (
		!validIdentifier(sourceId) ||
		!validIdentifier(input.source.key) ||
		(input.source.kind === "gmail-label" &&
			input.source.key !== `gmail:label:${sourceId}`) ||
		(input.source.kind === "graph-folder" &&
			input.source.key !== `graph:folder:${sourceId}`)
	) {
		throw new Error("invalid-mailbox-sync-source");
	}
}

const MAX_CONTINUATION_FINGERPRINTS = 100;
const SHA256_HEX = /^[0-9a-f]{64}$/;

function continuationFingerprint(value: string) {
	return createHash("sha256")
		.update("gnd:sales-request-mailbox-continuation:v1\0")
		.update(value)
		.digest("hex");
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
		throw new Error("invalid-mailbox-sync-lease-fence");
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
		throw new Error("invalid-mailbox-sync-authority-fence");
	}
}

function checkpointState(
	checkpoint: MailboxSyncCheckpoint | null,
	retentionFloor: Date,
	now: Date,
): MailboxSyncState {
	if (!checkpoint) {
		return {
			mode: "recovery-full",
			cursor: null,
			pageToken: null,
			pagesFetched: 0,
			messagesFetched: 0,
			cursorResets: 0,
			emptyContinuationPages: 0,
			retryAttempts: 0,
			since: retentionFloor,
			seenContinuations: [],
		};
	}
	if (
		!(checkpoint.since instanceof Date) ||
		Number.isNaN(checkpoint.since.getTime()) ||
		checkpoint.since.getTime() > now.getTime() ||
		!(
			checkpoint.mode === "incremental" || checkpoint.mode === "recovery-full"
		) ||
		(checkpoint.cursor !== null &&
			(typeof checkpoint.cursor !== "string" ||
				checkpoint.cursor.length === 0 ||
				checkpoint.cursor.length > 16 * 1024)) ||
		(checkpoint.pageToken !== null &&
			(typeof checkpoint.pageToken !== "string" ||
				checkpoint.pageToken.length === 0 ||
				checkpoint.pageToken.length > 16 * 1024)) ||
		!Number.isSafeInteger(checkpoint.retryAttempts) ||
		checkpoint.retryAttempts < 0 ||
		checkpoint.retryAttempts > 10 ||
		!Number.isSafeInteger(checkpoint.cursorResets) ||
		checkpoint.cursorResets < 0 ||
		checkpoint.cursorResets > 1 ||
		(checkpoint.mode === "incremental" && checkpoint.cursorResets !== 0) ||
		!Array.isArray(checkpoint.continuationFingerprints) ||
		checkpoint.continuationFingerprints.length >
			MAX_CONTINUATION_FINGERPRINTS ||
		checkpoint.continuationFingerprints.some(
			(value) => typeof value !== "string" || !SHA256_HEX.test(value),
		) ||
		new Set(checkpoint.continuationFingerprints).size !==
			checkpoint.continuationFingerprints.length ||
		(checkpoint.pageToken === null &&
			checkpoint.continuationFingerprints.length > 0) ||
		(checkpoint.pageToken !== null &&
			!checkpoint.continuationFingerprints.includes(
				continuationFingerprint(checkpoint.pageToken),
			)) ||
		(checkpoint.mode === "recovery-full" && checkpoint.cursor !== null)
	) {
		throw new Error("invalid-mailbox-sync-checkpoint");
	}
	const boundedSince = new Date(
		Math.max(checkpoint.since.getTime(), retentionFloor.getTime()),
	);
	return {
		mode:
			checkpoint.mode === "incremental" &&
			checkpoint.cursor === null &&
			checkpoint.pageToken === null
				? "recovery-full"
				: checkpoint.mode,
		cursor: checkpoint.cursor,
		pageToken: checkpoint.pageToken,
		pagesFetched: 0,
		messagesFetched: 0,
		cursorResets: checkpoint.cursorResets,
		emptyContinuationPages: 0,
		retryAttempts: checkpoint.retryAttempts,
		since: boundedSince,
		seenContinuations: [],
	};
}

function durableCheckpoint(
	state: MailboxSyncState,
	terminal = false,
	continuationFingerprints: readonly string[] = [],
): MailboxSyncCheckpoint {
	if (!state.since) throw new Error("mailbox-sync-since-required");
	return {
		cursor: state.cursor,
		pageToken: terminal ? null : state.pageToken,
		mode: terminal ? "incremental" : state.mode,
		since: state.since,
		retryAttempts: state.retryAttempts,
		cursorResets: terminal ? 0 : state.cursorResets,
		continuationFingerprints: terminal ? [] : continuationFingerprints,
	};
}

function nextContinuationFingerprints(
	current: readonly string[],
	nextPageToken: string | undefined,
) {
	if (!nextPageToken) return [];
	const next = [...current, continuationFingerprint(nextPageToken)];
	return next.slice(-MAX_CONTINUATION_FINGERPRINTS);
}

function fencedRunResult(
	result: MailboxSyncMutationResult,
): { kind: "lease-lost" | "authority-changed" } | null {
	return result.kind === "applied" ? null : { kind: result.kind };
}

function sourceListInput(source: MailboxSyncSource) {
	return source.kind === "gmail-label"
		? { labelId: source.labelId, folderId: undefined }
		: { folderId: source.folderId, labelId: undefined };
}

function providerPageProjections(input: {
	connectionId: string;
	connection: MailboxConnectionConfiguration;
	source: MailboxSyncSource;
	page: MailboxSyncPage;
}) {
	const provider = input.connection.provider;
	const summaries = input.page.messages.map((summary) => ({
		connectionId: input.connectionId,
		provider,
		sourceKey: input.source.key,
		summary,
		disposition: applyMailboxExclusions(summary, input.connection),
	}));
	const tombstones = input.page.removedProviderMessageIds.map(
		(providerMessageId) => ({
			connectionId: input.connectionId,
			provider,
			sourceKey: input.source.key,
			providerMessageId,
		}),
	);
	return { summaries, tombstones };
}

/**
 * Runs one leased connection+source stream. It projects provider summaries only;
 * message detail, immutable content hashing, queue identity, AI, and commercial
 * operations intentionally belong to later stages.
 */
export async function runMailboxSyncStream(
	input: {
		runId: string;
		connectionId: string;
		source: MailboxSyncSource;
		now: Date;
		leaseDurationMs: number;
		budget?: MailboxSyncBudget;
		clock?: () => Date;
		signal?: AbortSignal;
	},
	dependencies: MailboxSyncDependencies,
): Promise<MailboxSyncRunResult> {
	validateRunInput(input);
	const clock = input.clock ?? (() => new Date());
	const readClock = () => {
		const value = clock();
		if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
			throw new Error("invalid-mailbox-sync-clock");
		}
		return value;
	};
	if (input.signal?.aborted) return { kind: "cancelled" };
	const requestedExpiresAt = new Date(
		input.now.getTime() + input.leaseDurationMs,
	);
	const claimed = await dependencies.store.claimLease({
		runId: input.runId,
		connectionId: input.connectionId,
		source: input.source,
		now: input.now,
		leaseExpiresAt: requestedExpiresAt,
	});
	if (claimed.kind !== "claimed") return { kind: claimed.kind };
	if (input.signal?.aborted) return { kind: "cancelled" };
	const { lease } = claimed;
	if (lease.connectionId !== input.connectionId) {
		throw new Error("mailbox-sync-lease-scope-mismatch");
	}
	validateLeaseFence(lease.leaseFence, input.now, requestedExpiresAt);
	validateAuthorityFence(lease.authorityFence);
	const context: MailboxSyncLeaseContext = {
		runId: input.runId,
		connectionId: input.connectionId,
		source: input.source,
		leaseFence: lease.leaseFence,
		authorityFence: lease.authorityFence,
	};
	const controlFlowBeforeMutation = (): MailboxSyncRunResult | null => {
		if (input.signal?.aborted) return { kind: "cancelled" };
		return readClock().getTime() >= lease.leaseFence.expiresAt.getTime()
			? { kind: "lease-lost" }
			: null;
	};

	const suppress = async (
		reason: MailboxSyncSuppressionReason,
	): Promise<MailboxSyncRunResult> => {
		const controlFlow = controlFlowBeforeMutation();
		if (controlFlow) return controlFlow;
		const commitFenceResult = fencedRunResult(
			await dependencies.store.settleSuppressed({ ...context, reason }),
		);
		if (commitFenceResult) return commitFenceResult;
		return { kind: "suppressed", reason };
	};

	const parsedPolicy = salesRequestMailboxPolicySchema.safeParse(lease.policy);
	if (!parsedPolicy.success) return suppress("invalid-policy");
	const policy = parsedPolicy.data;
	if (!policy.enabled) return suppress("policy-disabled");
	if (policy.emergencyDisabled) return suppress("emergency-disabled");

	const parsedConnection = mailboxConnectionConfigurationSchema.safeParse(
		lease.connection,
	);
	if (!parsedConnection.success) return suppress("invalid-connection");
	const connection = parsedConnection.data;
	if (
		lease.authorityFence.organizationId !== connection.organizationId ||
		lease.authorityFence.ownerUserId !== connection.ownerUserId ||
		lease.authorityFence.provider !== connection.provider ||
		lease.authorityFence.policyRevision !== policy.revision
	) {
		throw new Error("mailbox-sync-authority-scope-mismatch");
	}
	if (!lease.authorityFence.ownerActive) return suppress("owner-inactive");
	if (!lease.authorityFence.connectionActive) {
		return suppress("connection-inactive");
	}
	if (!policy.supportedProviders.includes(connection.provider)) {
		return suppress("provider-not-allowed");
	}
	if (!policy.eligibleUserIds.includes(connection.ownerUserId)) {
		return suppress("owner-not-eligible");
	}

	let configuredSources: readonly MailboxSyncSource[];
	try {
		configuredSources = resolveMailboxSyncSources(connection);
	} catch {
		return suppress("invalid-connection");
	}
	if (
		mailboxSyncSourceProvider(input.source) !== connection.provider ||
		!configuredSources.some(
			(source) =>
				source.kind === input.source.kind && source.key === input.source.key,
		)
	) {
		return suppress("source-not-configured");
	}

	const adapter = dependencies.adapters[connection.provider];
	if (!adapter || adapter.provider !== connection.provider) {
		throw new Error("mailbox-sync-adapter-unavailable");
	}
	const budget = input.budget ?? DEFAULT_MAILBOX_SYNC_BUDGET;
	const initialSince = new Date(
		input.now.getTime() - policy.retentionDays * 24 * 60 * 60_000,
	);
	let expectedCheckpoint = lease.checkpoint;
	let state = checkpointState(lease.checkpoint, initialSince, input.now);
	let continuationFingerprints = [
		...(lease.checkpoint?.continuationFingerprints ?? []),
	];
	const runProviderOperation = <T>(
		now: Date,
		request: (signal: AbortSignal) => Promise<T>,
	) =>
		runMailboxProviderRequest({
			provider: connection.provider,
			signal: input.signal,
			deadlineAt: lease.leaseFence.expiresAt,
			deadlineKind: "lease-expired",
			deadlineReserveMs: MAILBOX_PROVIDER_DEADLINE_RESERVE_MS,
			now,
			request,
		});
	// Validate the budget before opening a provider stream.
	getMailboxSyncRequest(state, budget);
	let messagesProjected = 0;
	let messagesSuppressed = 0;
	let tombstonesProjected = 0;

	while (true) {
		const currentTime = readClock();
		if (input.signal?.aborted) return { kind: "cancelled" };
		if (currentTime.getTime() >= lease.leaseFence.expiresAt.getTime()) {
			return { kind: "lease-lost" };
		}
		const request = getMailboxSyncRequest(state, budget);
		let page: MailboxSyncPage;
		let providerError: MailboxProviderError | undefined;
		try {
			page = await runProviderOperation(currentTime, (signal) =>
				adapter.listMessages({
					...request,
					...sourceListInput(input.source),
					tokens: lease.tokens,
					signal,
				}),
			);
		} catch (error) {
			if (error instanceof MailboxProviderRequestAbort) {
				return error.reason === "caller-cancelled"
					? { kind: "cancelled" }
					: { kind: "lease-lost" };
			}
			if (!(error instanceof MailboxProviderError)) throw error;
			if (error.provider !== connection.provider) throw error;
			providerError = error;
			page = undefined as never;
		}
		if (input.signal?.aborted) return { kind: "cancelled" };
		const afterProvider = readClock();
		if (afterProvider.getTime() >= lease.leaseFence.expiresAt.getTime()) {
			return { kind: "lease-lost" };
		}

		const transition = providerError
			? advanceMailboxSync({
					state,
					outcome: { kind: "error", error: providerError },
					budget,
				})
			: advanceMailboxSync({
					state,
					outcome: { kind: "page", page },
					budget,
				});

		if (transition.kind === "reset-cursor") {
			const nextCheckpoint = durableCheckpoint(transition.state, false, []);
			const controlFlow = controlFlowBeforeMutation();
			if (controlFlow) return controlFlow;
			const fenced = fencedRunResult(
				await dependencies.store.checkpointCursorReset({
					...context,
					expectedCheckpoint,
					nextCheckpoint,
				}),
			);
			if (fenced) return fenced;
			expectedCheckpoint = nextCheckpoint;
			state = transition.state;
			continuationFingerprints = [];
			continue;
		}
		if (transition.kind === "retry") {
			if (!providerError) throw new Error("mailbox-sync-transition-mismatch");
			const checkpoint = durableCheckpoint(
				transition.state,
				false,
				continuationFingerprints,
			);
			const controlFlow = controlFlowBeforeMutation();
			if (controlFlow) return controlFlow;
			const fenced = fencedRunResult(
				await dependencies.store.settleRetry({
					...context,
					checkpoint,
					retryAfterMs: transition.retryAfterMs,
					evidence: mailboxProviderErrorEvidence(providerError),
				}),
			);
			if (fenced) return fenced;
			return {
				kind: "retry-pending",
				retryAfterMs: transition.retryAfterMs,
			};
		}
		if (transition.kind === "reauthorize") {
			if (!providerError) throw new Error("mailbox-sync-transition-mismatch");
			const controlFlow = controlFlowBeforeMutation();
			if (controlFlow) return controlFlow;
			const fenced = fencedRunResult(
				await dependencies.store.settleReauthorization({
					...context,
					checkpoint: durableCheckpoint(
						transition.state,
						false,
						continuationFingerprints,
					),
					evidence: mailboxProviderErrorEvidence(providerError),
				}),
			);
			if (fenced) return fenced;
			return { kind: "reauthorization-required" };
		}
		if (transition.kind === "fail") {
			const controlFlow = controlFlowBeforeMutation();
			if (controlFlow) return controlFlow;
			const fenced = fencedRunResult(
				await dependencies.store.settleDeadLetter({
					...context,
					checkpoint: durableCheckpoint(state, false, continuationFingerprints),
					reason: transition.reason,
					...(providerError
						? { evidence: mailboxProviderErrorEvidence(providerError) }
						: {}),
				}),
			);
			if (fenced) return fenced;
			return { kind: "dead-lettered", reason: transition.reason };
		}
		const nextFingerprint = page.nextPageToken
			? continuationFingerprint(page.nextPageToken)
			: null;
		if (nextFingerprint && continuationFingerprints.includes(nextFingerprint)) {
			const controlFlow = controlFlowBeforeMutation();
			if (controlFlow) return controlFlow;
			const fenced = fencedRunResult(
				await dependencies.store.settleDeadLetter({
					...context,
					checkpoint: durableCheckpoint(state, false, continuationFingerprints),
					reason: "continuation-loop",
				}),
			);
			if (fenced) return fenced;
			return { kind: "dead-lettered", reason: "continuation-loop" };
		}

		const projections = providerPageProjections({
			connectionId: input.connectionId,
			connection,
			source: input.source,
			page,
		});
		const terminal = transition.kind === "complete" && !transition.truncated;
		const nextFingerprints = nextContinuationFingerprints(
			continuationFingerprints,
			page.nextPageToken,
		);
		const nextCheckpoint = durableCheckpoint(
			transition.state,
			terminal,
			nextFingerprints,
		);
		const controlFlow = controlFlowBeforeMutation();
		if (controlFlow) return controlFlow;
		const settlementFenceResult = fencedRunResult(
			await dependencies.store.commitPageAndCheckpoint({
				...context,
				expectedCheckpoint,
				nextCheckpoint,
				summaries: projections.summaries,
				tombstones: projections.tombstones,
			}),
		);
		if (settlementFenceResult) return settlementFenceResult;
		expectedCheckpoint = nextCheckpoint;
		state = transition.state;
		continuationFingerprints = nextFingerprints;
		messagesProjected += projections.summaries.filter(
			(item) => item.disposition.accepted,
		).length;
		messagesSuppressed += projections.summaries.filter(
			(item) => !item.disposition.accepted,
		).length;
		tombstonesProjected += projections.tombstones.length;

		if (transition.kind !== "complete") continue;
		const settlement: MailboxSyncSettlement = {
			...context,
			checkpoint: nextCheckpoint,
			pagesFetched: transition.state.pagesFetched,
			messagesProjected,
			messagesSuppressed,
			tombstonesProjected,
		};
		if (transition.truncated) {
			const controlFlow = controlFlowBeforeMutation();
			if (controlFlow) return controlFlow;
			const fenced = fencedRunResult(
				await dependencies.store.settleContinuation(settlement),
			);
			if (fenced) return fenced;
			return {
				kind: "continuation-pending",
				pagesFetched: transition.state.pagesFetched,
				messagesProjected,
				messagesSuppressed,
				tombstonesProjected,
			};
		}
		const completeControlFlow = controlFlowBeforeMutation();
		if (completeControlFlow) return completeControlFlow;
		const fenced = fencedRunResult(
			await dependencies.store.settleComplete(settlement),
		);
		if (fenced) return fenced;
		return {
			kind: "complete",
			pagesFetched: transition.state.pagesFetched,
			messagesProjected,
			messagesSuppressed,
			tombstonesProjected,
		};
	}
}
