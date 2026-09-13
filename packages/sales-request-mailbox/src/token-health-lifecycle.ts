import type { MailboxTokenSet, SalesRequestMailboxAdapter } from "./adapter.js";
import {
	buildMailboxScopeFingerprint,
	validateMailboxGrantedScopes,
} from "./connection-lifecycle.js";
import { type MailboxProvider, mailboxProviderSchema } from "./contracts.js";
import type { MailboxEncryptedSecret } from "./crypto.js";
import {
	decryptMailboxSecret,
	encryptMailboxSecret,
	mailboxEncryptedSecretSchema,
} from "./crypto.js";
import { MailboxProviderError } from "./errors.js";

const MAX_IDENTIFIER_LENGTH = 255;
const MAX_TOKEN_LENGTH = 16 * 1024;

export const MAILBOX_TOKEN_HEALTH_LEASE_MS = 2 * 60_000;
export const MAILBOX_TOKEN_REFRESH_BEFORE_EXPIRY_MS = 5 * 60_000;
export const MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS = 5;

export const MAILBOX_TOKEN_REFRESH_COMMIT_BEHAVIOR = {
	incrementConnectionRevision: true,
	invalidatePriorRevisionWork: true,
	preservePreferences: true,
	preserveSourceSelections: true,
	preserveCursors: true,
	preserveSubscriptions: true,
} as const;

export type MailboxTokenHealthReason = "token-expiring" | "forced-health-check";

export type MailboxTokenHealthErrorCode =
	| "authorization-revoked"
	| "scope-mismatch"
	| "account-mismatch"
	| "provider-mismatch"
	| "malformed-response"
	| "credentials-unavailable"
	| "rate-limited"
	| "network"
	| "provider-unavailable"
	| "internal-failure";

export type MailboxTokenHealthClaim = {
	operationId: string;
	leaseId: string;
	leaseEpoch: number;
	leaseExpiresAt: Date;
	connectionId: string;
	connectionRevision: number;
	organizationId: number;
	ownerUserId: number;
	employeeProfileId: number;
	officeAuthorityKey: string;
	authorityRevision: string;
	salesSettingsId: number;
	salesSettingsRevision: number;
	policyRevision: number;
	provider: MailboxProvider;
	providerAccountId: string;
	grantedScopes: readonly string[];
	scopeFingerprint: string;
	accessToken: MailboxEncryptedSecret;
	refreshToken: MailboxEncryptedSecret;
	tokenExpiresAt: Date | null;
	retryAttempt: number;
};

export type MailboxTokenHealthResult =
	| { kind: "healthy"; connectionRevision: number }
	| { kind: "reauthorization-required"; connectionRevision: number }
	| { kind: "dead-lettered"; connectionRevision: number }
	| { kind: "retry-scheduled"; nextAttemptAt: Date }
	| { kind: "not-due" }
	| { kind: "lease-contended" }
	| {
			kind: "rejected";
			reason: "connection-unavailable" | "connection-changed";
	  };

type MailboxTokenHealthMutationFence = Pick<
	MailboxTokenHealthClaim,
	| "operationId"
	| "leaseId"
	| "leaseEpoch"
	| "leaseExpiresAt"
	| "connectionId"
	| "connectionRevision"
	| "organizationId"
	| "ownerUserId"
	| "employeeProfileId"
	| "officeAuthorityKey"
	| "authorityRevision"
	| "salesSettingsId"
	| "salesSettingsRevision"
	| "policyRevision"
	| "provider"
	| "providerAccountId"
>;

export interface MailboxTokenHealthStore {
	/**
	 * Atomically claims only an active, currently authorized connection whose
	 * token is within the refresh window, unless the explicit forced-health mode
	 * is supplied. The transaction validates every revision/authority/policy
	 * fence and returns encrypted credential envelopes only.
	 */
	claimTokenHealth(input: {
		connectionId: string;
		expectedConnectionRevision: number;
		operationId: string;
		reason: MailboxTokenHealthReason;
		now: Date;
		leaseDurationMs: typeof MAILBOX_TOKEN_HEALTH_LEASE_MS;
		refreshBeforeExpiryMs: typeof MAILBOX_TOKEN_REFRESH_BEFORE_EXPIRY_MS;
		maxRetryAttempts: typeof MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS;
	}): Promise<
		| { kind: "claimed"; claim: MailboxTokenHealthClaim }
		| { kind: "not-due" }
		| { kind: "lease-contended" }
		| {
				kind: "completed";
				outcome: "healthy" | "reauthorization-required" | "dead-lettered";
				connectionRevision: number;
		  }
		| { kind: "unavailable" }
		| { kind: "connection-changed" }
	>;
	/**
	 * Atomically CASes every lease, connection, authority, and policy fence.
	 * The store must also require `leaseExpiresAt` to be later than its own
	 * database current time; the caller clock check is defense in depth only.
	 */
	commitRefreshedTokens(
		input: MailboxTokenHealthMutationFence & {
			credentials: {
				grantedScopes: readonly string[];
				scopeFingerprint: string;
				accessToken: MailboxEncryptedSecret;
				refreshToken: MailboxEncryptedSecret;
				tokenExpiresAt: Date;
			};
			health: {
				status: "healthy";
				checkedAt: Date;
				refreshedAt: Date;
				errorCode: null;
				nextAttemptAt: null;
				retryAttempt: 0;
			};
			commitBehavior: typeof MAILBOX_TOKEN_REFRESH_COMMIT_BEHAVIOR;
		},
	): Promise<
		| { kind: "committed"; connectionRevision: number }
		| { kind: "claim-lost" | "authority-changed" | "connection-changed" }
	>;
	/**
	 * Accepts bounded health metadata only; raw errors and tokens are forbidden.
	 * The store must reject the mutation when `leaseExpiresAt` is not later than
	 * its own database current time.
	 */
	settleTokenHealth(
		input: MailboxTokenHealthMutationFence & {
			status:
				| "temporarily-unavailable"
				| "reauthorization-required"
				| "dead-lettered";
			errorCode: MailboxTokenHealthErrorCode;
			checkedAt: Date;
			nextAttemptAt: Date | null;
			retryAttempt: number;
			blockSync: boolean;
			incrementConnectionRevision: boolean;
			invalidatePriorRevisionWork: boolean;
			preservePreferences: true;
			preserveSourceSelections: true;
			preserveCursors: true;
			preserveSubscriptions: true;
		},
	): Promise<
		| { kind: "settled"; connectionRevision: number }
		| { kind: "claim-lost" | "authority-changed" | "connection-changed" }
	>;
}

export type MailboxTokenHealthDependencies = {
	store: MailboxTokenHealthStore;
	adapters: Readonly<
		Partial<Record<MailboxProvider, SalesRequestMailboxAdapter>>
	>;
	keyRing: {
		resolve(keyVersion: string): Buffer;
		active(): { keyVersion: string; key: Buffer };
	};
	clock?: () => Date;
};

function validIdentifier(value: string) {
	return (
		typeof value === "string" &&
		value.trim() === value &&
		value.length > 0 &&
		value.length <= MAX_IDENTIFIER_LENGTH
	);
}

function validRevision(value: number) {
	return Number.isSafeInteger(value) && value >= 0;
}

function validPositiveInteger(value: number) {
	return Number.isSafeInteger(value) && value > 0;
}

function validDate(value: Date) {
	return value instanceof Date && !Number.isNaN(value.getTime());
}

function mutationFence(claim: MailboxTokenHealthClaim) {
	return {
		operationId: claim.operationId,
		leaseId: claim.leaseId,
		leaseEpoch: claim.leaseEpoch,
		leaseExpiresAt: claim.leaseExpiresAt,
		connectionId: claim.connectionId,
		connectionRevision: claim.connectionRevision,
		organizationId: claim.organizationId,
		ownerUserId: claim.ownerUserId,
		employeeProfileId: claim.employeeProfileId,
		officeAuthorityKey: claim.officeAuthorityKey,
		authorityRevision: claim.authorityRevision,
		salesSettingsId: claim.salesSettingsId,
		salesSettingsRevision: claim.salesSettingsRevision,
		policyRevision: claim.policyRevision,
		provider: claim.provider,
		providerAccountId: claim.providerAccountId,
	} satisfies MailboxTokenHealthMutationFence;
}

function validClaim(
	claim: MailboxTokenHealthClaim,
	input: {
		connectionId: string;
		expectedConnectionRevision: number;
		operationId: string;
	},
	now: Date,
) {
	if (!mailboxProviderSchema.safeParse(claim.provider).success) return false;
	const scopes = validateMailboxGrantedScopes(
		claim.provider,
		claim.grantedScopes,
	);
	return (
		claim.operationId === input.operationId &&
		validIdentifier(claim.leaseId) &&
		validPositiveInteger(claim.leaseEpoch) &&
		validDate(claim.leaseExpiresAt) &&
		claim.leaseExpiresAt.getTime() > now.getTime() &&
		claim.connectionId === input.connectionId &&
		claim.connectionRevision === input.expectedConnectionRevision &&
		validRevision(claim.connectionRevision) &&
		validPositiveInteger(claim.organizationId) &&
		validPositiveInteger(claim.ownerUserId) &&
		validPositiveInteger(claim.employeeProfileId) &&
		validIdentifier(claim.officeAuthorityKey) &&
		validIdentifier(claim.authorityRevision) &&
		validPositiveInteger(claim.salesSettingsId) &&
		validRevision(claim.salesSettingsRevision) &&
		validRevision(claim.policyRevision) &&
		validIdentifier(claim.providerAccountId) &&
		scopes !== null &&
		claim.scopeFingerprint ===
			buildMailboxScopeFingerprint({ provider: claim.provider, scopes }) &&
		mailboxEncryptedSecretSchema.safeParse(claim.accessToken).success &&
		mailboxEncryptedSecretSchema.safeParse(claim.refreshToken).success &&
		(claim.tokenExpiresAt === null || validDate(claim.tokenExpiresAt)) &&
		validRevision(claim.retryAttempt) &&
		claim.retryAttempt < MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS
	);
}

function settlementBehavior(
	terminal: boolean,
): Pick<
	Parameters<MailboxTokenHealthStore["settleTokenHealth"]>[0],
	| "blockSync"
	| "incrementConnectionRevision"
	| "invalidatePriorRevisionWork"
	| "preservePreferences"
	| "preserveSourceSelections"
	| "preserveCursors"
	| "preserveSubscriptions"
> {
	return {
		blockSync: terminal,
		incrementConnectionRevision: terminal,
		invalidatePriorRevisionWork: terminal,
		preservePreferences: true,
		preserveSourceSelections: true,
		preserveCursors: true,
		preserveSubscriptions: true,
	};
}

async function settle(
	store: MailboxTokenHealthStore,
	claim: MailboxTokenHealthClaim,
	input: {
		status:
			| "temporarily-unavailable"
			| "reauthorization-required"
			| "dead-lettered";
		errorCode: MailboxTokenHealthErrorCode;
		checkedAt: Date;
		nextAttemptAt: Date | null;
		retryAttempt: number;
	},
): Promise<MailboxTokenHealthResult> {
	const terminal = input.status !== "temporarily-unavailable";
	let settled: Awaited<
		ReturnType<MailboxTokenHealthStore["settleTokenHealth"]>
	>;
	try {
		settled = await store.settleTokenHealth({
			...mutationFence(claim),
			...input,
			...settlementBehavior(terminal),
		});
	} catch {
		return { kind: "lease-contended" };
	}
	if (settled.kind !== "settled") return { kind: "lease-contended" };
	if (input.status === "temporarily-unavailable") {
		if (settled.connectionRevision !== claim.connectionRevision) {
			return { kind: "lease-contended" };
		}
		return {
			kind: "retry-scheduled",
			nextAttemptAt: input.nextAttemptAt as Date,
		};
	}
	if (settled.connectionRevision !== claim.connectionRevision + 1) {
		return { kind: "lease-contended" };
	}
	return { kind: input.status, connectionRevision: settled.connectionRevision };
}

async function settleTerminal(
	store: MailboxTokenHealthStore,
	claim: MailboxTokenHealthClaim,
	status: "reauthorization-required" | "dead-lettered",
	errorCode: MailboxTokenHealthErrorCode,
	checkedAt: Date,
	retryAttempt = claim.retryAttempt,
) {
	return settle(store, claim, {
		status,
		errorCode,
		checkedAt,
		nextAttemptAt: null,
		retryAttempt,
	});
}

function freshLeaseTime(
	dependencies: Pick<MailboxTokenHealthDependencies, "clock">,
	claim: Pick<MailboxTokenHealthClaim, "leaseExpiresAt">,
) {
	const checkedAt = dependencies.clock?.() ?? new Date();
	return validDate(checkedAt) &&
		checkedAt.getTime() < claim.leaseExpiresAt.getTime()
		? checkedAt
		: null;
}

function providerFailure(
	error: MailboxProviderError,
	claim: MailboxTokenHealthClaim,
) {
	if (error.provider !== claim.provider) {
		return {
			status: "dead-lettered" as const,
			errorCode: "provider-mismatch" as const,
		};
	}
	if (error.code === "authorization-revoked") {
		return {
			status: "reauthorization-required" as const,
			errorCode: "authorization-revoked" as const,
		};
	}
	if (error.code === "account-mismatch") {
		return {
			status: "reauthorization-required" as const,
			errorCode: "account-mismatch" as const,
		};
	}
	if (
		error.code === "rate-limited" ||
		error.code === "network" ||
		error.code === "provider-unavailable"
	) {
		if (error.retryDelayExceeded) {
			return {
				status: "dead-lettered" as const,
				errorCode: error.code,
			};
		}
		return {
			status: "temporarily-unavailable" as const,
			errorCode: error.code,
			retryAfterMs: error.retryAfterMs ?? 5_000,
		};
	}
	return {
		status: "dead-lettered" as const,
		errorCode: "malformed-response" as const,
	};
}

export async function runMailboxTokenHealthLifecycle(
	input: {
		connectionId: string;
		expectedConnectionRevision: number;
		operationId: string;
		reason: MailboxTokenHealthReason;
		now?: Date;
	},
	dependencies: MailboxTokenHealthDependencies,
): Promise<MailboxTokenHealthResult> {
	if (
		!validIdentifier(input.connectionId) ||
		!validRevision(input.expectedConnectionRevision) ||
		!validIdentifier(input.operationId)
	) {
		return { kind: "rejected", reason: "connection-unavailable" };
	}
	const now = input.now ?? dependencies.clock?.() ?? new Date();
	if (!validDate(now)) throw new Error("invalid-mailbox-token-health");

	let claimed: Awaited<ReturnType<MailboxTokenHealthStore["claimTokenHealth"]>>;
	try {
		claimed = await dependencies.store.claimTokenHealth({
			connectionId: input.connectionId,
			expectedConnectionRevision: input.expectedConnectionRevision,
			operationId: input.operationId,
			reason: input.reason,
			now,
			leaseDurationMs: MAILBOX_TOKEN_HEALTH_LEASE_MS,
			refreshBeforeExpiryMs: MAILBOX_TOKEN_REFRESH_BEFORE_EXPIRY_MS,
			maxRetryAttempts: MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS,
		});
	} catch {
		return { kind: "lease-contended" };
	}
	if (claimed.kind === "not-due") return { kind: "not-due" };
	if (claimed.kind === "lease-contended") return { kind: "lease-contended" };
	if (claimed.kind === "unavailable") {
		return { kind: "rejected", reason: "connection-unavailable" };
	}
	if (claimed.kind === "connection-changed") {
		return { kind: "rejected", reason: "connection-changed" };
	}
	if (claimed.kind === "completed") {
		if (claimed.connectionRevision !== input.expectedConnectionRevision + 1) {
			return { kind: "lease-contended" };
		}
		return {
			kind: claimed.outcome,
			connectionRevision: claimed.connectionRevision,
		};
	}

	const { claim } = claimed;
	if (!validClaim(claim, input, now)) return { kind: "lease-contended" };
	const adapter = dependencies.adapters[claim.provider];
	if (!adapter || adapter.provider !== claim.provider) {
		return settleTerminal(
			dependencies.store,
			claim,
			"dead-lettered",
			"provider-mismatch",
			now,
		);
	}

	let currentTokens: MailboxTokenSet;
	try {
		currentTokens = {
			accessToken: decryptMailboxSecret({
				envelope: claim.accessToken,
				resolveKey: (keyVersion) => dependencies.keyRing.resolve(keyVersion),
				binding: `${claim.connectionId}:access-token`,
			}),
			refreshToken: decryptMailboxSecret({
				envelope: claim.refreshToken,
				resolveKey: (keyVersion) => dependencies.keyRing.resolve(keyVersion),
				binding: `${claim.connectionId}:refresh-token`,
			}),
			expiresAt: claim.tokenExpiresAt ?? undefined,
			grantedScopes: claim.grantedScopes,
		};
	} catch {
		return settleTerminal(
			dependencies.store,
			claim,
			"dead-lettered",
			"credentials-unavailable",
			now,
		);
	}

	const durableRefreshToken = currentTokens.refreshToken;
	let refreshed: MailboxTokenSet;
	try {
		refreshed = await adapter.refreshTokens({ tokens: currentTokens });
	} catch (error) {
		currentTokens = { accessToken: "", grantedScopes: [] };
		const checkedAt = freshLeaseTime(dependencies, claim);
		if (!checkedAt) return { kind: "lease-contended" };
		if (!(error instanceof MailboxProviderError)) {
			return settleTerminal(
				dependencies.store,
				claim,
				"dead-lettered",
				"internal-failure",
				checkedAt,
			);
		}
		const failure = providerFailure(error, claim);
		if (failure.status !== "temporarily-unavailable") {
			return settleTerminal(
				dependencies.store,
				claim,
				failure.status,
				failure.errorCode,
				checkedAt,
			);
		}
		const nextRetryAttempt = claim.retryAttempt + 1;
		if (nextRetryAttempt >= MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS) {
			return settleTerminal(
				dependencies.store,
				claim,
				"dead-lettered",
				failure.errorCode,
				checkedAt,
				nextRetryAttempt,
			);
		}
		const nextAttemptAt = new Date(checkedAt.getTime() + failure.retryAfterMs);
		return settle(dependencies.store, claim, {
			status: "temporarily-unavailable",
			errorCode: failure.errorCode,
			checkedAt,
			nextAttemptAt,
			retryAttempt: nextRetryAttempt,
		});
	}
	currentTokens = { accessToken: "", grantedScopes: [] };
	const checkedAt = freshLeaseTime(dependencies, claim);
	if (!checkedAt) return { kind: "lease-contended" };
	if (!refreshed || !Array.isArray(refreshed.grantedScopes)) {
		return settleTerminal(
			dependencies.store,
			claim,
			"dead-lettered",
			"malformed-response",
			checkedAt,
		);
	}
	const scopes = validateMailboxGrantedScopes(
		claim.provider,
		refreshed.grantedScopes,
	);
	if (!scopes) {
		return settleTerminal(
			dependencies.store,
			claim,
			"reauthorization-required",
			"scope-mismatch",
			checkedAt,
		);
	}
	if (
		typeof refreshed.accessToken !== "string" ||
		!refreshed.accessToken.trim() ||
		refreshed.accessToken.length > MAX_TOKEN_LENGTH ||
		!validDate(refreshed.expiresAt as Date) ||
		(refreshed.expiresAt as Date).getTime() <= checkedAt.getTime()
	) {
		return settleTerminal(
			dependencies.store,
			claim,
			"dead-lettered",
			"malformed-response",
			checkedAt,
		);
	}
	const refreshToken = refreshed.refreshToken ?? durableRefreshToken;
	if (
		typeof refreshToken !== "string" ||
		!refreshToken.trim() ||
		refreshToken.length > MAX_TOKEN_LENGTH
	) {
		return settleTerminal(
			dependencies.store,
			claim,
			"reauthorization-required",
			"authorization-revoked",
			checkedAt,
		);
	}
	let committed: Awaited<
		ReturnType<MailboxTokenHealthStore["commitRefreshedTokens"]>
	>;
	let credentials: Parameters<
		MailboxTokenHealthStore["commitRefreshedTokens"]
	>[0]["credentials"];
	try {
		const activeKey = dependencies.keyRing.active();
		credentials = {
			grantedScopes: scopes,
			scopeFingerprint: buildMailboxScopeFingerprint({
				provider: claim.provider,
				scopes,
			}),
			accessToken: encryptMailboxSecret({
				plaintext: refreshed.accessToken,
				key: activeKey.key,
				keyVersion: activeKey.keyVersion,
				binding: `${claim.connectionId}:access-token`,
			}),
			refreshToken: encryptMailboxSecret({
				plaintext: refreshToken,
				key: activeKey.key,
				keyVersion: activeKey.keyVersion,
				binding: `${claim.connectionId}:refresh-token`,
			}),
			tokenExpiresAt: refreshed.expiresAt as Date,
		};
	} catch {
		return settleTerminal(
			dependencies.store,
			claim,
			"dead-lettered",
			"credentials-unavailable",
			checkedAt,
		);
	}
	try {
		committed = await dependencies.store.commitRefreshedTokens({
			...mutationFence(claim),
			credentials,
			health: {
				status: "healthy",
				checkedAt,
				refreshedAt: checkedAt,
				errorCode: null,
				nextAttemptAt: null,
				retryAttempt: 0,
			},
			commitBehavior: MAILBOX_TOKEN_REFRESH_COMMIT_BEHAVIOR,
		});
	} catch {
		return { kind: "lease-contended" };
	}
	return committed.kind === "committed" &&
		committed.connectionRevision === claim.connectionRevision + 1
		? { kind: "healthy", connectionRevision: committed.connectionRevision }
		: { kind: "lease-contended" };
}
