import type { MailboxTokenSet, SalesRequestMailboxAdapter } from "./adapter.js";
import { type MailboxProvider, mailboxProviderSchema } from "./contracts.js";
import type { MailboxEncryptedSecret } from "./crypto.js";
import { decryptMailboxSecret } from "./crypto.js";
import { MailboxProviderError } from "./errors.js";
import {
	MAILBOX_PROVIDER_REVOKE_TIMEOUT_MS,
	MailboxProviderRequestAbort,
	runMailboxProviderRequest,
} from "./provider-request.js";

const MAX_IDENTIFIER_LENGTH = 255;
const MAX_SCOPES = 20;
const MAX_SCOPE_LENGTH = 512;

export const MAILBOX_DISCONNECT_AUTHORITY_BEHAVIOR = {
	requireActiveEmployee: true,
	requireActiveProfile: true,
	requireCanonicalActiveOffice: true,
	requireOwnerMatch: true,
	ignoreMailboxPolicy: true,
} as const;

export const MAILBOX_DISCONNECT_CLAIM_BEHAVIOR = {
	deactivateConnection: true,
	incrementConnectionRevision: true,
	invalidateSyncLeases: true,
	invalidateCursors: true,
	invalidateSubscriptions: true,
	blockNewReads: true,
	persistResumableDisconnect: true,
} as const;

export const MAILBOX_DISCONNECT_CLEANUP_BEHAVIOR = {
	eraseCredentials: true,
	eraseProviderAccountIdentity: true,
	erasePrivateSyncState: true,
	purgeRetainedSourceContent: "immediately",
	retainAudit: "content-free-only",
} as const;

export type MailboxDisconnectClaim = {
	disconnectId: string;
	connectionId: string;
	previousConnectionRevision: number;
	connectionRevision: number;
	organizationId: number;
	ownerUserId: number;
	employeeProfileId: number;
	officeAuthorityKey: string;
	authorityRevision: string;
	provider: MailboxProvider;
	providerAccountId: string;
	grantedScopes: readonly string[];
	accessToken: MailboxEncryptedSecret;
	refreshToken: MailboxEncryptedSecret | null;
	tokenExpiresAt: Date | null;
};

export type MailboxDisconnectCleanupClaim = Pick<
	MailboxDisconnectClaim,
	| "disconnectId"
	| "connectionId"
	| "previousConnectionRevision"
	| "connectionRevision"
	| "organizationId"
	| "ownerUserId"
	| "employeeProfileId"
	| "officeAuthorityKey"
	| "authorityRevision"
>;

export type MailboxDisconnectFailurePhase = "provider-revocation" | "cleanup";

export type MailboxDisconnectFailureReason =
	| "credentials-unavailable"
	| "provider-unavailable"
	| "provider-revocation-cancelled"
	| "provider-revocation-deadline"
	| "provider-revocation-failed"
	| "state-transition-failed"
	| "cleanup-cancelled"
	| "cleanup-failed";

/**
 * The concrete store owns all durable state and transaction boundaries.
 * `claimDisconnect` must resolve the current actor's active employee/profile,
 * canonical active office, and exact owner connection in one transaction. It
 * must make cross-owner and missing records indistinguishable.
 *
 * A first claim uses connection-revision CAS, deactivates the connection,
 * increments its revision, invalidates read/sync authority, and persists a
 * resumable disconnect before returning encrypted provider material. A repeated
 * claim for the same original revision resumes the durable phase instead of
 * reporting a revision conflict.
 */
export interface MailboxDisconnectStore {
	claimDisconnect(input: {
		actorUserId: number;
		connectionId: string;
		expectedConnectionRevision: number;
		now: Date;
		authorityBehavior: typeof MAILBOX_DISCONNECT_AUTHORITY_BEHAVIOR;
		claimBehavior: typeof MAILBOX_DISCONNECT_CLAIM_BEHAVIOR;
	}): Promise<
		| { kind: "provider-revocation-required"; claim: MailboxDisconnectClaim }
		| { kind: "cleanup-required"; claim: MailboxDisconnectCleanupClaim }
		| { kind: "completed" }
		| { kind: "unavailable" }
		| { kind: "connection-changed" }
	>;
	/** Persists provider success before any destructive local cleanup. */
	recordProviderRevoked(
		input: MailboxDisconnectCleanupClaim & {
			now: Date;
		},
	): Promise<{ kind: "cleanup-required" } | { kind: "claim-lost" }>;
	/** Accepts bounded content-free codes only; never accept errors or tokens. */
	recordDisconnectFailure(
		input: MailboxDisconnectCleanupClaim & {
			phase: MailboxDisconnectFailurePhase;
			reason: MailboxDisconnectFailureReason;
			now: Date;
		},
	): Promise<{ kind: "recorded" } | { kind: "claim-lost" }>;
	/**
	 * Final transactional cleanup erases credentials and all private sync state,
	 * immediately purges retained source content, and keeps content-free audit only.
	 */
	completeDisconnect(
		input: MailboxDisconnectCleanupClaim & {
			now: Date;
			cleanupBehavior: typeof MAILBOX_DISCONNECT_CLEANUP_BEHAVIOR;
		},
	): Promise<{ kind: "completed" } | { kind: "claim-lost" }>;
}

export type MailboxDisconnectKeyRing = {
	resolve(keyVersion: string): Buffer;
};

export type MailboxDisconnectDependencies = {
	store: MailboxDisconnectStore;
	adapters: Readonly<
		Partial<Record<MailboxProvider, SalesRequestMailboxAdapter>>
	>;
	keyRing: MailboxDisconnectKeyRing;
	clock?: () => Date;
};

export type DisconnectMailboxConnectionResult =
	| { kind: "disconnected" }
	| { kind: "cancelled" }
	| { kind: "retry-pending" }
	| {
			kind: "rejected";
			reason:
				| "missing-session"
				| "connection-unavailable"
				| "connection-changed";
	  };

function validPositiveInteger(value: number) {
	return Number.isSafeInteger(value) && value > 0;
}

function validRevision(value: number) {
	return Number.isSafeInteger(value) && value >= 0;
}

function validIdentifier(value: string) {
	return (
		typeof value === "string" &&
		value.trim() === value &&
		value.length > 0 &&
		value.length <= MAX_IDENTIFIER_LENGTH
	);
}

function validDate(value: Date) {
	return value instanceof Date && !Number.isNaN(value.getTime());
}

function cleanupClaim(
	claim: MailboxDisconnectClaim,
): MailboxDisconnectCleanupClaim {
	return {
		disconnectId: claim.disconnectId,
		connectionId: claim.connectionId,
		previousConnectionRevision: claim.previousConnectionRevision,
		connectionRevision: claim.connectionRevision,
		organizationId: claim.organizationId,
		ownerUserId: claim.ownerUserId,
		employeeProfileId: claim.employeeProfileId,
		officeAuthorityKey: claim.officeAuthorityKey,
		authorityRevision: claim.authorityRevision,
	};
}

function validCleanupClaim(
	claim: MailboxDisconnectCleanupClaim,
	input: {
		actorUserId: number;
		connectionId: string;
		expectedConnectionRevision: number;
	},
) {
	return (
		validIdentifier(claim.disconnectId) &&
		claim.connectionId === input.connectionId &&
		validPositiveInteger(claim.organizationId) &&
		claim.ownerUserId === input.actorUserId &&
		validPositiveInteger(claim.employeeProfileId) &&
		validIdentifier(claim.officeAuthorityKey) &&
		validIdentifier(claim.authorityRevision) &&
		validRevision(claim.previousConnectionRevision) &&
		validRevision(claim.connectionRevision) &&
		claim.previousConnectionRevision === input.expectedConnectionRevision &&
		claim.connectionRevision === claim.previousConnectionRevision + 1
	);
}

function validProviderClaim(
	claim: MailboxDisconnectClaim,
	input: {
		actorUserId: number;
		connectionId: string;
		expectedConnectionRevision: number;
	},
) {
	return (
		validCleanupClaim(claim, input) &&
		mailboxProviderSchema.safeParse(claim.provider).success &&
		validIdentifier(claim.providerAccountId) &&
		Array.isArray(claim.grantedScopes) &&
		claim.grantedScopes.length <= MAX_SCOPES &&
		claim.grantedScopes.every(
			(scope) =>
				typeof scope === "string" &&
				scope.trim() === scope &&
				scope.length > 0 &&
				scope.length <= MAX_SCOPE_LENGTH,
		) &&
		(claim.tokenExpiresAt === null || validDate(claim.tokenExpiresAt))
	);
}

async function bestEffortRecordFailure(
	store: MailboxDisconnectStore,
	claim: MailboxDisconnectCleanupClaim,
	phase: MailboxDisconnectFailurePhase,
	reason: MailboxDisconnectFailureReason,
	clock?: () => Date,
) {
	try {
		const now = clock?.() ?? new Date();
		if (!validDate(now)) return;
		await store.recordDisconnectFailure({ ...claim, phase, reason, now });
	} catch {
		// The connection is already inactive and the durable claim remains resumable.
	}
}

async function finishLocalCleanup(
	claim: MailboxDisconnectCleanupClaim,
	dependencies: Pick<MailboxDisconnectDependencies, "store" | "clock">,
): Promise<DisconnectMailboxConnectionResult> {
	try {
		const now = dependencies.clock?.() ?? new Date();
		if (!validDate(now)) return { kind: "retry-pending" };
		const completed = await dependencies.store.completeDisconnect({
			...claim,
			now,
			cleanupBehavior: MAILBOX_DISCONNECT_CLEANUP_BEHAVIOR,
		});
		return completed.kind === "completed"
			? { kind: "disconnected" }
			: { kind: "retry-pending" };
	} catch {
		await bestEffortRecordFailure(
			dependencies.store,
			claim,
			"cleanup",
			"cleanup-failed",
			dependencies.clock,
		);
		return { kind: "retry-pending" };
	}
}

export async function disconnectMailboxConnection(
	input: {
		actorUserId: number | null;
		connectionId: string;
		expectedConnectionRevision: number;
		now?: Date;
		signal?: AbortSignal;
	},
	dependencies: MailboxDisconnectDependencies,
): Promise<DisconnectMailboxConnectionResult> {
	if (input.actorUserId == null || !validPositiveInteger(input.actorUserId)) {
		return { kind: "rejected", reason: "missing-session" };
	}
	if (
		!validIdentifier(input.connectionId) ||
		!validRevision(input.expectedConnectionRevision)
	) {
		return { kind: "rejected", reason: "connection-unavailable" };
	}
	if (input.signal?.aborted) return { kind: "cancelled" };
	const now = input.now ?? dependencies.clock?.() ?? new Date();
	if (!validDate(now)) throw new Error("invalid-mailbox-disconnect");
	const clock = dependencies.clock ?? (() => new Date());

	const claimed = await dependencies.store.claimDisconnect({
		actorUserId: input.actorUserId,
		connectionId: input.connectionId,
		expectedConnectionRevision: input.expectedConnectionRevision,
		now,
		authorityBehavior: MAILBOX_DISCONNECT_AUTHORITY_BEHAVIOR,
		claimBehavior: MAILBOX_DISCONNECT_CLAIM_BEHAVIOR,
	});
	if (claimed.kind === "completed") return { kind: "disconnected" };
	if (claimed.kind === "unavailable") {
		return { kind: "rejected", reason: "connection-unavailable" };
	}
	if (claimed.kind === "connection-changed") {
		return { kind: "rejected", reason: "connection-changed" };
	}
	if (claimed.kind === "cleanup-required") {
		if (
			!validCleanupClaim(claimed.claim, {
				actorUserId: input.actorUserId,
				connectionId: input.connectionId,
				expectedConnectionRevision: input.expectedConnectionRevision,
			})
		) {
			return claimed.claim.ownerUserId === input.actorUserId
				? { kind: "retry-pending" }
				: { kind: "rejected", reason: "connection-unavailable" };
		}
		if (input.signal?.aborted) {
			await bestEffortRecordFailure(
				dependencies.store,
				claimed.claim,
				"cleanup",
				"cleanup-cancelled",
				clock,
			);
			return { kind: "retry-pending" };
		}
		return finishLocalCleanup(claimed.claim, {
			store: dependencies.store,
			clock,
		});
	}

	const providerClaim = claimed.claim;
	const localClaim = cleanupClaim(providerClaim);
	if (
		!validProviderClaim(providerClaim, {
			actorUserId: input.actorUserId,
			connectionId: input.connectionId,
			expectedConnectionRevision: input.expectedConnectionRevision,
		})
	) {
		if (providerClaim.ownerUserId !== input.actorUserId) {
			return { kind: "rejected", reason: "connection-unavailable" };
		}
		if (
			validCleanupClaim(localClaim, {
				actorUserId: input.actorUserId,
				connectionId: input.connectionId,
				expectedConnectionRevision: input.expectedConnectionRevision,
			})
		) {
			await bestEffortRecordFailure(
				dependencies.store,
				localClaim,
				"provider-revocation",
				"state-transition-failed",
				clock,
			);
		}
		return { kind: "retry-pending" };
	}
	if (input.signal?.aborted) {
		await bestEffortRecordFailure(
			dependencies.store,
			localClaim,
			"provider-revocation",
			"provider-revocation-cancelled",
			clock,
		);
		return { kind: "retry-pending" };
	}

	const adapter = dependencies.adapters[providerClaim.provider];
	if (!adapter || adapter.provider !== providerClaim.provider) {
		await bestEffortRecordFailure(
			dependencies.store,
			localClaim,
			"provider-revocation",
			"provider-unavailable",
			clock,
		);
		return { kind: "retry-pending" };
	}

	let tokens: MailboxTokenSet | undefined;
	try {
		tokens = {
			accessToken: decryptMailboxSecret({
				envelope: providerClaim.accessToken,
				resolveKey: (keyVersion) => dependencies.keyRing.resolve(keyVersion),
				binding: `${providerClaim.connectionId}:access-token`,
			}),
			refreshToken: providerClaim.refreshToken
				? decryptMailboxSecret({
						envelope: providerClaim.refreshToken,
						resolveKey: (keyVersion) =>
							dependencies.keyRing.resolve(keyVersion),
						binding: `${providerClaim.connectionId}:refresh-token`,
					})
				: undefined,
			expiresAt: providerClaim.tokenExpiresAt ?? undefined,
			grantedScopes: providerClaim.grantedScopes,
		};
	} catch {
		await bestEffortRecordFailure(
			dependencies.store,
			localClaim,
			"provider-revocation",
			"credentials-unavailable",
			clock,
		);
		return { kind: "retry-pending" };
	}

	const providerTokens = tokens;
	try {
		if (providerClaim.provider === "microsoft-graph") {
			await adapter.revoke({ tokens: providerTokens });
		} else {
			await runMailboxProviderRequest({
				provider: providerClaim.provider,
				signal: input.signal,
				timeoutMs: MAILBOX_PROVIDER_REVOKE_TIMEOUT_MS,
				now: clock?.() ?? new Date(),
				request: (signal) => adapter.revoke({ tokens: providerTokens, signal }),
			});
		}
	} catch (error) {
		tokens = undefined;
		const reason =
			error instanceof MailboxProviderRequestAbort
				? "provider-revocation-cancelled"
				: error instanceof MailboxProviderError &&
						error.requestFailure === "request-timeout"
					? "provider-revocation-deadline"
					: "provider-revocation-failed";
		await bestEffortRecordFailure(
			dependencies.store,
			localClaim,
			"provider-revocation",
			reason,
			clock,
		);
		return { kind: "retry-pending" };
	}
	tokens = undefined;

	let recorded: Awaited<
		ReturnType<MailboxDisconnectStore["recordProviderRevoked"]>
	>;
	try {
		const recordAt = clock?.() ?? new Date();
		if (!validDate(recordAt)) return { kind: "retry-pending" };
		recorded = await dependencies.store.recordProviderRevoked({
			...localClaim,
			now: recordAt,
		});
	} catch {
		await bestEffortRecordFailure(
			dependencies.store,
			localClaim,
			"provider-revocation",
			"state-transition-failed",
			clock,
		);
		return { kind: "retry-pending" };
	}
	if (recorded.kind !== "cleanup-required") {
		return { kind: "retry-pending" };
	}
	return finishLocalCleanup(localClaim, { store: dependencies.store, clock });
}
