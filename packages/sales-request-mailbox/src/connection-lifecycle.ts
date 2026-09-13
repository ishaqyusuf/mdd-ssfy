import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type {
	MailboxAccountIdentity,
	MailboxTokenSet,
	SalesRequestMailboxAdapter,
} from "./adapter.js";
import {
	MAILBOX_PROVIDER_AUTHORIZATION,
	type MailboxProvider,
	mailboxProviderAccountIdentitySchema,
	salesRequestMailboxPolicySchema,
} from "./contracts.js";
import type { MailboxEncryptedSecret } from "./crypto.js";
import { encryptMailboxSecret } from "./crypto.js";
import { MailboxProviderError } from "./errors.js";
import {
	type MailboxOAuthRedirectKey,
	createMailboxOAuthAttempt,
	digestMailboxOAuthState,
} from "./oauth-state.js";

const MAX_IDENTIFIER_LENGTH = 255;
const MAX_TOKEN_LENGTH = 16 * 1024;
const OAUTH_STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type MailboxConnectionAuthoritySnapshot = {
	ownerUserId: number;
	employeeProfileId: number;
	organizationId: number;
	officeMembershipId: number;
	authorityRevision: string;
	salesSettingsId: number;
	salesSettingsRevision: number;
	policy: unknown;
	providerEligible: boolean;
};

export type MailboxConnectionStartAuthorityRejection =
	| "employee-inactive"
	| "profile-inactive"
	| "office-unavailable"
	| "settings-unavailable";

export type MailboxConnectionAttemptRecord = {
	stateDigest: string;
	organizationId: number;
	ownerUserId: number;
	employeeProfileId: number;
	officeMembershipId: number;
	provider: MailboxProvider;
	redirectKey: MailboxOAuthRedirectKey;
	issuedAt: Date;
	expiresAt: Date;
	salesSettingsId: number;
	salesSettingsRevision: number;
	policyRevision: number;
	authorityRevision: string;
	consumedAt: null;
};

export type MailboxConnectionConsumedAttempt = Omit<
	MailboxConnectionAttemptRecord,
	"consumedAt"
> & {
	consumedAt: Date;
};

export type MailboxConnectionTarget =
	| {
			kind: "new";
			connectionId: string;
	  }
	| {
			kind: "reconnect";
			connectionId: string;
			expectedConnectionRevision: number;
			expectedScopeFingerprint: string;
	  };

export type MailboxConnectionCommitRecord = {
	providerAccountId: string;
	accountEmail: string;
	displayName: string | null;
	grantedScopes: readonly string[];
	scopeFingerprint: string;
	accessToken: MailboxEncryptedSecret;
	refreshToken: MailboxEncryptedSecret;
	tokenExpiresAt: Date | null;
};

export type MailboxConnectionAttemptTerminalReason =
	| "provider-authorization-failed"
	| "provider-temporarily-unavailable"
	| "provider-response-invalid"
	| "connection-unavailable"
	| "authority-changed"
	| "connection-changed"
	| "internal-failure";

/**
 * The concrete store owns every transaction and current-record check. Start
 * authority resolution must select the employee's active profile and canonical
 * active office (primary first, then lowest stable office id), plus the single
 * current company-wide Sales Settings row and its mailbox policy.
 */
export interface MailboxConnectionLifecycleStore {
	resolveStartAuthority(input: {
		actorUserId: number;
		provider: MailboxProvider;
		now: Date;
	}): Promise<
		| { kind: "authorized"; authority: MailboxConnectionAuthoritySnapshot }
		| {
				kind: "rejected";
				reason: MailboxConnectionStartAuthorityRejection;
		  }
	>;
	/** Atomically rechecks every supplied authority/settings/policy revision. */
	createAttempt(
		input: MailboxConnectionAttemptRecord,
	): Promise<{ kind: "created" } | { kind: "authority-changed" | "conflict" }>;
	/**
	 * Atomically locates the exact digest and validates actor, canonical office,
	 * provider, redirect, expiry, current active employee/profile, and the current
	 * global Sales Settings/policy revisions before consuming it. Actor/provider/
	 * redirect mismatches must not consume. A matching expired, policy-invalid, or
	 * cancelled attempt is consumed as terminal in the same transaction.
	 */
	consumeCallbackAttempt(input: {
		stateDigest: string;
		actorUserId: number;
		provider: MailboxProvider;
		redirectKey: MailboxOAuthRedirectKey;
		callbackKind: "code" | "cancelled";
		now: Date;
	}): Promise<
		| { kind: "ready"; attempt: MailboxConnectionConsumedAttempt }
		| { kind: "cancelled" }
		| { kind: "mismatch" }
		| { kind: "already-consumed" }
		| {
				kind: "terminal";
				reason: "expired" | "authority-changed" | "policy-changed";
		  }
	>;
	/**
	 * Uses providerAccountId, never email, for global identity uniqueness. It may
	 * return reconnect only for the same owner and organization; every cross-owner
	 * or cross-organization match is an opaque identity conflict and cannot transfer.
	 */
	prepareConnectionTarget(input: {
		attempt: MailboxConnectionConsumedAttempt;
		candidateConnectionId: string;
		providerAccountId: string;
		scopeFingerprint: string;
		now: Date;
	}): Promise<
		| { kind: "prepared"; target: MailboxConnectionTarget }
		| {
				kind: "identity-conflict" | "authority-changed" | "attempt-invalid";
		  }
	>;
	/**
	 * Atomically rechecks the consumed attempt, active actor/profile/canonical
	 * office, global settings/policy revisions, provider identity uniqueness, and
	 * reconnect revision/scope fingerprint. Reconnect preserves owner/preferences,
	 * increments revision, and resets cursor/subscription/health for bounded recovery.
	 */
	commitConnection(input: {
		attempt: MailboxConnectionConsumedAttempt;
		target: MailboxConnectionTarget;
		connection: MailboxConnectionCommitRecord;
		now: Date;
		reconnectBehavior: {
			preserveOwner: true;
			preservePreferences: true;
			incrementRevision: true;
			resetCursor: true;
			resetSubscription: true;
			resetHealthForBoundedRecovery: true;
		};
	}): Promise<
		| {
				kind: "committed";
				connectionId: string;
				connectionRevision: number;
		  }
		| {
				kind:
					| "identity-conflict"
					| "authority-changed"
					| "attempt-invalid"
					| "connection-changed";
		  }
	>;
	/** Best-effort only; no raw provider material is accepted by this method. */
	terminalizeAttempt(input: {
		attempt: MailboxConnectionConsumedAttempt;
		reason: MailboxConnectionAttemptTerminalReason;
		now: Date;
	}): Promise<void>;
}

export type MailboxConnectionKeyRing = {
	active(): { keyVersion: string; key: Buffer };
};

export type MailboxConnectionLifecycleDependencies = {
	store: MailboxConnectionLifecycleStore;
	adapters: Readonly<
		Partial<Record<MailboxProvider, SalesRequestMailboxAdapter>>
	>;
	clock?: () => Date;
	createConnectionId?: () => string;
	keyRing?: MailboxConnectionKeyRing;
};

export type StartMailboxConnectionResult =
	| { kind: "authorization-ready"; authorizationUrl: string }
	| {
			kind: "rejected";
			reason:
				| "missing-session"
				| MailboxConnectionStartAuthorityRejection
				| "invalid-authority"
				| "policy-disabled"
				| "emergency-disabled"
				| "owner-ineligible"
				| "provider-ineligible"
				| "provider-unavailable"
				| "authority-changed";
	  };

export type CompleteMailboxConnectionResult =
	| {
			kind: "connected";
			connectionId: string;
			connectionRevision: number;
			operation: "created" | "reconnected";
	  }
	| { kind: "cancelled" }
	| {
			kind: "rejected";
			reason:
				| "missing-session"
				| "invalid-attempt"
				| "expired"
				| "authority-changed"
				| "connection-unavailable"
				| "connection-changed";
	  }
	| { kind: "provider-authorization-failed" }
	| { kind: "provider-temporarily-unavailable" }
	| { kind: "provider-response-invalid" };

function validPositiveInteger(value: number) {
	return Number.isSafeInteger(value) && value > 0;
}

function validIdentifier(value: string) {
	return (
		typeof value === "string" &&
		value.trim() === value &&
		value.length > 0 &&
		value.length <= MAX_IDENTIFIER_LENGTH
	);
}

function validateAuthority(
	authority: MailboxConnectionAuthoritySnapshot,
	actorUserId: number,
) {
	return (
		authority.ownerUserId === actorUserId &&
		validPositiveInteger(authority.employeeProfileId) &&
		validPositiveInteger(authority.organizationId) &&
		validPositiveInteger(authority.officeMembershipId) &&
		validPositiveInteger(authority.salesSettingsId) &&
		Number.isSafeInteger(authority.salesSettingsRevision) &&
		authority.salesSettingsRevision >= 0 &&
		validIdentifier(authority.authorityRevision)
	);
}

function validDate(value: Date) {
	return value instanceof Date && !Number.isNaN(value.getTime());
}

function matchingDigest(left: string, right: string) {
	const leftBytes = Buffer.from(left);
	const rightBytes = Buffer.from(right);
	return (
		leftBytes.byteLength === rightBytes.byteLength &&
		timingSafeEqual(leftBytes, rightBytes)
	);
}

function validateConsumedAttempt(input: {
	attempt: MailboxConnectionConsumedAttempt;
	stateDigest: string;
	actorUserId: number;
	provider: MailboxProvider;
	redirectKey: MailboxOAuthRedirectKey;
	now: Date;
}) {
	const { attempt } = input;
	return (
		matchingDigest(attempt.stateDigest, input.stateDigest) &&
		attempt.ownerUserId === input.actorUserId &&
		attempt.provider === input.provider &&
		attempt.redirectKey === input.redirectKey &&
		validPositiveInteger(attempt.organizationId) &&
		validPositiveInteger(attempt.employeeProfileId) &&
		validPositiveInteger(attempt.officeMembershipId) &&
		validPositiveInteger(attempt.salesSettingsId) &&
		Number.isSafeInteger(attempt.salesSettingsRevision) &&
		attempt.salesSettingsRevision >= 0 &&
		Number.isSafeInteger(attempt.policyRevision) &&
		attempt.policyRevision >= 0 &&
		validIdentifier(attempt.authorityRevision) &&
		validDate(attempt.issuedAt) &&
		validDate(attempt.expiresAt) &&
		validDate(attempt.consumedAt) &&
		attempt.issuedAt.getTime() <= attempt.consumedAt.getTime() &&
		attempt.consumedAt.getTime() <= input.now.getTime() &&
		input.now.getTime() < attempt.expiresAt.getTime()
	);
}

export async function startMailboxConnection(
	input: {
		actorUserId: number | null;
		provider: MailboxProvider;
		redirectKey: MailboxOAuthRedirectKey;
		now?: Date;
	},
	dependencies: Pick<
		MailboxConnectionLifecycleDependencies,
		"adapters" | "clock"
	> & {
		store: Pick<
			MailboxConnectionLifecycleStore,
			"resolveStartAuthority" | "createAttempt"
		>;
	},
): Promise<StartMailboxConnectionResult> {
	if (input.actorUserId == null || !validPositiveInteger(input.actorUserId)) {
		return { kind: "rejected", reason: "missing-session" };
	}
	const now = input.now ?? dependencies.clock?.() ?? new Date();
	if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
		throw new Error("invalid-mailbox-connection-start");
	}
	const resolved = await dependencies.store.resolveStartAuthority({
		actorUserId: input.actorUserId,
		provider: input.provider,
		now,
	});
	if (resolved.kind === "rejected") {
		return { kind: "rejected", reason: resolved.reason };
	}
	const { authority } = resolved;
	if (!validateAuthority(authority, input.actorUserId)) {
		return { kind: "rejected", reason: "invalid-authority" };
	}
	const policy = salesRequestMailboxPolicySchema.safeParse(authority.policy);
	if (!policy.success) {
		return { kind: "rejected", reason: "invalid-authority" };
	}
	if (!policy.data.enabled) {
		return { kind: "rejected", reason: "policy-disabled" };
	}
	if (policy.data.emergencyDisabled) {
		return { kind: "rejected", reason: "emergency-disabled" };
	}
	if (!policy.data.eligibleUserIds.includes(input.actorUserId)) {
		return { kind: "rejected", reason: "owner-ineligible" };
	}
	if (
		!authority.providerEligible ||
		!policy.data.supportedProviders.includes(input.provider)
	) {
		return { kind: "rejected", reason: "provider-ineligible" };
	}
	const adapter = dependencies.adapters[input.provider];
	if (!adapter || adapter.provider !== input.provider) {
		return { kind: "rejected", reason: "provider-unavailable" };
	}
	const created = createMailboxOAuthAttempt({
		organizationId: authority.organizationId,
		ownerUserId: authority.ownerUserId,
		provider: input.provider,
		redirectKey: input.redirectKey,
		now,
	});
	let authorizationUrl: string;
	try {
		authorizationUrl = await adapter.createAuthorizationUrl({
			state: created.state,
		});
	} catch (error) {
		if (error instanceof MailboxProviderError) {
			return { kind: "rejected", reason: "provider-unavailable" };
		}
		throw error;
	}
	const stored = await dependencies.store.createAttempt({
		...created.attempt,
		employeeProfileId: authority.employeeProfileId,
		officeMembershipId: authority.officeMembershipId,
		salesSettingsId: authority.salesSettingsId,
		salesSettingsRevision: authority.salesSettingsRevision,
		policyRevision: policy.data.revision,
		authorityRevision: authority.authorityRevision,
	});
	if (stored.kind !== "created") {
		return { kind: "rejected", reason: "authority-changed" };
	}
	return { kind: "authorization-ready", authorizationUrl };
}

export function buildMailboxScopeFingerprint(input: {
	provider: MailboxProvider;
	scopes: readonly string[];
}) {
	const scopes = [
		...new Set(
			input.scopes.map((scope) => normalizeScope(input.provider, scope)),
		),
	].sort();
	return `mcs1:${createHash("sha256")
		.update("gnd:sales-request-mailbox-scopes:v1\0")
		.update(input.provider)
		.update("\0")
		.update(JSON.stringify(scopes))
		.digest("hex")}`;
}

function normalizeScope(provider: MailboxProvider, value: string) {
	const normalized = value.trim().toLowerCase();
	if (provider === "microsoft-graph") {
		return normalized.replace(/^https:\/\/graph\.microsoft\.com\//, "");
	}
	return normalized;
}

function validateGrantedScopes(
	provider: MailboxProvider,
	grantedScopes: readonly string[],
) {
	if (!Array.isArray(grantedScopes) || grantedScopes.length > 20) return null;
	const normalizedGrant = [
		...new Set(
			grantedScopes.map((scope) =>
				typeof scope === "string" ? normalizeScope(provider, scope) : "",
			),
		),
	].sort();
	if (normalizedGrant.some((scope) => !scope || scope.length > 512))
		return null;
	const normalized = normalizedGrant.filter(
		(scope) => provider !== "microsoft-graph" || scope !== "offline_access",
	);
	const approved = [
		...new Set(
			MAILBOX_PROVIDER_AUTHORIZATION[provider].scopes.map((scope) =>
				normalizeScope(provider, scope),
			),
		),
	]
		.filter(
			(scope) => provider !== "microsoft-graph" || scope !== "offline_access",
		)
		.sort();
	if (
		normalized.length !== approved.length ||
		normalized.some((scope, index) => scope !== approved[index])
	) {
		return null;
	}
	return normalized;
}

function validateExchange(input: {
	provider: MailboxProvider;
	tokens: MailboxTokenSet;
	account: MailboxAccountIdentity;
}) {
	if (
		!input.tokens ||
		typeof input.tokens.accessToken !== "string" ||
		!input.tokens.accessToken.trim() ||
		input.tokens.accessToken.length > MAX_TOKEN_LENGTH ||
		typeof input.tokens.refreshToken !== "string" ||
		!input.tokens.refreshToken.trim() ||
		input.tokens.refreshToken.length > MAX_TOKEN_LENGTH ||
		(input.tokens.expiresAt !== undefined &&
			(!(input.tokens.expiresAt instanceof Date) ||
				Number.isNaN(input.tokens.expiresAt.getTime())))
	) {
		return null;
	}
	const scopes = validateGrantedScopes(
		input.provider,
		input.tokens.grantedScopes,
	);
	if (!scopes || input.account?.provider !== input.provider) return null;
	const identity = mailboxProviderAccountIdentitySchema.safeParse({
		provider: input.account.provider,
		providerAccountId: input.account.providerAccountId,
		accountEmail: input.account.email,
	});
	if (
		!identity.success ||
		identity.data.providerAccountId !== input.account.providerAccountId
	) {
		return null;
	}
	const displayName = input.account.displayName?.trim();
	if (
		displayName !== undefined &&
		(!displayName || displayName.length > MAX_IDENTIFIER_LENGTH)
	) {
		return null;
	}
	return {
		accessToken: input.tokens.accessToken,
		refreshToken: input.tokens.refreshToken,
		tokenExpiresAt: input.tokens.expiresAt ?? null,
		grantedScopes: scopes,
		scopeFingerprint: buildMailboxScopeFingerprint({
			provider: input.provider,
			scopes,
		}),
		providerAccountId: identity.data.providerAccountId,
		accountEmail: identity.data.accountEmail,
		displayName: displayName ?? null,
	};
}

function providerFailureResult(error: MailboxProviderError): {
	result: CompleteMailboxConnectionResult;
	reason: MailboxConnectionAttemptTerminalReason;
} {
	if (error.requiresReauthorization) {
		return {
			result: { kind: "provider-authorization-failed" },
			reason: "provider-authorization-failed",
		};
	}
	if (error.retryable) {
		return {
			result: { kind: "provider-temporarily-unavailable" },
			reason: "provider-temporarily-unavailable",
		};
	}
	return {
		result: { kind: "provider-response-invalid" },
		reason: "provider-response-invalid",
	};
}

async function bestEffortTerminalize(
	store: MailboxConnectionLifecycleStore,
	attempt: MailboxConnectionConsumedAttempt,
	reason: MailboxConnectionAttemptTerminalReason,
	now: Date,
) {
	// A provisional grant can represent the same provider account as an existing or
	// concurrently winning connection. Revocation belongs only to explicit disconnect.
	await Promise.allSettled([
		store.terminalizeAttempt({ attempt, reason, now }),
	]);
}

function terminalAttemptResult(
	reason: "expired" | "authority-changed" | "policy-changed",
): CompleteMailboxConnectionResult {
	if (reason === "expired") return { kind: "rejected", reason: "expired" };
	if (reason === "authority-changed" || reason === "policy-changed") {
		return { kind: "rejected", reason: "authority-changed" };
	}
	return { kind: "rejected", reason: "invalid-attempt" };
}

export async function completeMailboxConnection(
	input: {
		actorUserId: number | null;
		provider: MailboxProvider;
		redirectKey: MailboxOAuthRedirectKey;
		state: string;
		result: { kind: "code"; code: string } | { kind: "cancelled" };
		now?: Date;
	},
	dependencies: MailboxConnectionLifecycleDependencies,
): Promise<CompleteMailboxConnectionResult> {
	if (input.actorUserId == null || !validPositiveInteger(input.actorUserId)) {
		return { kind: "rejected", reason: "missing-session" };
	}
	if (
		typeof input.state !== "string" ||
		!OAUTH_STATE_PATTERN.test(input.state)
	) {
		return { kind: "rejected", reason: "invalid-attempt" };
	}
	const now = input.now ?? dependencies.clock?.() ?? new Date();
	if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
		throw new Error("invalid-mailbox-connection-callback");
	}
	const consumed = await dependencies.store.consumeCallbackAttempt({
		stateDigest: digestMailboxOAuthState(input.state),
		actorUserId: input.actorUserId,
		provider: input.provider,
		redirectKey: input.redirectKey,
		callbackKind: input.result.kind,
		now,
	});
	if (consumed.kind === "cancelled") return { kind: "cancelled" };
	if (consumed.kind === "mismatch" || consumed.kind === "already-consumed") {
		return { kind: "rejected", reason: "invalid-attempt" };
	}
	if (consumed.kind === "terminal") {
		return terminalAttemptResult(consumed.reason);
	}

	const { attempt } = consumed;
	const stateDigest = digestMailboxOAuthState(input.state);
	if (
		!validateConsumedAttempt({
			attempt,
			stateDigest,
			actorUserId: input.actorUserId,
			provider: input.provider,
			redirectKey: input.redirectKey,
			now,
		})
	) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"authority-changed",
			now,
		);
		return { kind: "rejected", reason: "invalid-attempt" };
	}
	const adapter = dependencies.adapters[input.provider];
	if (!adapter || adapter.provider !== input.provider) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"provider-response-invalid",
			now,
		);
		return { kind: "provider-response-invalid" };
	}
	if (
		input.result.kind !== "code" ||
		typeof input.result.code !== "string" ||
		!input.result.code.trim() ||
		input.result.code.length > MAX_TOKEN_LENGTH
	) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"provider-response-invalid",
			now,
		);
		return { kind: "provider-response-invalid" };
	}

	let exchange: { tokens: MailboxTokenSet; account: MailboxAccountIdentity };
	try {
		exchange = await adapter.exchangeAuthorizationCode({
			code: input.result.code,
		});
	} catch (error) {
		if (!(error instanceof MailboxProviderError)) {
			await bestEffortTerminalize(
				dependencies.store,
				attempt,
				"internal-failure",
				now,
			);
			throw error;
		}
		const failure = providerFailureResult(error);
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			failure.reason,
			now,
		);
		return failure.result;
	}

	const validated = validateExchange({
		provider: input.provider,
		tokens: exchange.tokens,
		account: exchange.account,
	});
	if (!validated) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"provider-response-invalid",
			now,
		);
		return { kind: "provider-response-invalid" };
	}

	const candidateConnectionId =
		dependencies.createConnectionId?.() ?? randomUUID();
	if (
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			candidateConnectionId,
		)
	) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"internal-failure",
			now,
		);
		throw new Error("invalid-mailbox-connection-id");
	}

	let prepared: Awaited<
		ReturnType<MailboxConnectionLifecycleStore["prepareConnectionTarget"]>
	>;
	try {
		prepared = await dependencies.store.prepareConnectionTarget({
			attempt,
			candidateConnectionId,
			providerAccountId: validated.providerAccountId,
			scopeFingerprint: validated.scopeFingerprint,
			now,
		});
	} catch (error) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"internal-failure",
			now,
		);
		throw error;
	}
	if (prepared.kind !== "prepared") {
		const reason =
			prepared.kind === "identity-conflict"
				? "connection-unavailable"
				: "authority-changed";
		await bestEffortTerminalize(dependencies.store, attempt, reason, now);
		return { kind: "rejected", reason };
	}
	const target = prepared.target;
	const validTarget =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			target.connectionId,
		) &&
		(target.kind === "new"
			? target.connectionId === candidateConnectionId
			: Number.isSafeInteger(target.expectedConnectionRevision) &&
				target.expectedConnectionRevision > 0 &&
				/^mcs1:[0-9a-f]{64}$/.test(target.expectedScopeFingerprint));
	if (!validTarget) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"internal-failure",
			now,
		);
		throw new Error("invalid-mailbox-connection-target");
	}

	const keyRing = dependencies.keyRing;
	if (!keyRing) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"internal-failure",
			now,
		);
		throw new Error("mailbox-connection-key-ring-required");
	}

	let committed: Awaited<
		ReturnType<MailboxConnectionLifecycleStore["commitConnection"]>
	>;
	try {
		const activeKey = keyRing.active();
		const connection: MailboxConnectionCommitRecord = {
			providerAccountId: validated.providerAccountId,
			accountEmail: validated.accountEmail,
			displayName: validated.displayName,
			grantedScopes: validated.grantedScopes,
			scopeFingerprint: validated.scopeFingerprint,
			accessToken: encryptMailboxSecret({
				plaintext: validated.accessToken,
				key: activeKey.key,
				keyVersion: activeKey.keyVersion,
				binding: `${prepared.target.connectionId}:access-token`,
			}),
			refreshToken: encryptMailboxSecret({
				plaintext: validated.refreshToken,
				key: activeKey.key,
				keyVersion: activeKey.keyVersion,
				binding: `${prepared.target.connectionId}:refresh-token`,
			}),
			tokenExpiresAt: validated.tokenExpiresAt,
		};
		committed = await dependencies.store.commitConnection({
			attempt,
			target: prepared.target,
			connection,
			now,
			reconnectBehavior: {
				preserveOwner: true,
				preservePreferences: true,
				incrementRevision: true,
				resetCursor: true,
				resetSubscription: true,
				resetHealthForBoundedRecovery: true,
			},
		});
	} catch (error) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"internal-failure",
			now,
		);
		throw error;
	}
	if (committed.kind !== "committed") {
		const reason =
			committed.kind === "identity-conflict"
				? "connection-unavailable"
				: committed.kind === "connection-changed"
					? "connection-changed"
					: "authority-changed";
		await bestEffortTerminalize(dependencies.store, attempt, reason, now);
		return { kind: "rejected", reason };
	}
	if (
		committed.connectionId !== prepared.target.connectionId ||
		!Number.isSafeInteger(committed.connectionRevision) ||
		committed.connectionRevision < 1
	) {
		await bestEffortTerminalize(
			dependencies.store,
			attempt,
			"internal-failure",
			now,
		);
		throw new Error("invalid-mailbox-connection-commit");
	}
	return {
		kind: "connected",
		connectionId: committed.connectionId,
		connectionRevision: committed.connectionRevision,
		operation: prepared.target.kind === "new" ? "created" : "reconnected",
	};
}
