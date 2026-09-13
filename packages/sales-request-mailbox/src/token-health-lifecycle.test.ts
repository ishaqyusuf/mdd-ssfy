import { describe, expect, test } from "bun:test";
import type { MailboxTokenSet, SalesRequestMailboxAdapter } from "./adapter";
import { buildMailboxScopeFingerprint } from "./connection-lifecycle";
import { MAILBOX_PROVIDER_AUTHORIZATION } from "./contracts";
import { decryptMailboxSecret, encryptMailboxSecret } from "./crypto";
import { MailboxProviderError } from "./errors";
import { MailboxProviderRequestAbort } from "./provider-request";
import {
	MAILBOX_TOKEN_HEALTH_LEASE_MS,
	MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS,
	MAILBOX_TOKEN_REFRESH_BEFORE_EXPIRY_MS,
	type MailboxTokenHealthClaim,
	type MailboxTokenHealthStore,
	runMailboxTokenHealthLifecycle,
} from "./token-health-lifecycle";

const NOW = new Date("2026-09-13T16:00:00.000Z");
const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";
const OPERATION_ID = "22222222-2222-4222-8222-222222222222";
const KEY = Buffer.alloc(32, 7);
const ACTIVE_KEY = Buffer.alloc(32, 9);
const SCOPES = MAILBOX_PROVIDER_AUTHORIZATION.gmail.scopes;

function encrypted(value: string, purpose: "access-token" | "refresh-token") {
	return encryptMailboxSecret({
		plaintext: value,
		key: KEY,
		keyVersion: "k1",
		binding: `${CONNECTION_ID}:${purpose}`,
	});
}

function claim(
	overrides: Partial<MailboxTokenHealthClaim> = {},
): MailboxTokenHealthClaim {
	return {
		operationId: OPERATION_ID,
		leaseId: "lease-1",
		leaseEpoch: 3,
		leaseExpiresAt: new Date(NOW.getTime() + 120_000),
		connectionId: CONNECTION_ID,
		connectionRevision: 6,
		organizationId: 10,
		ownerUserId: 20,
		employeeProfileId: 30,
		officeAuthorityKey: "office-authority-v1:canonical-role-evidence",
		authorityRevision: "authority-7",
		salesSettingsId: 3,
		salesSettingsRevision: 9,
		policyRevision: 4,
		provider: "gmail",
		providerAccountId: "provider-account-1",
		grantedScopes: SCOPES,
		scopeFingerprint: buildMailboxScopeFingerprint({
			provider: "gmail",
			scopes: SCOPES,
		}),
		accessToken: encrypted("old-access", "access-token"),
		refreshToken: encrypted("old-refresh", "refresh-token"),
		tokenExpiresAt: new Date(NOW.getTime() + 60_000),
		retryAttempt: 0,
		...overrides,
	};
}

function store(overrides: Partial<MailboxTokenHealthStore> = {}) {
	const calls = {
		claims: [] as unknown[],
		commits: [] as unknown[],
		settlements: [] as unknown[],
	};
	let providerStarted = false;
	let claimFinished = false;
	const api: MailboxTokenHealthStore = {
		async claimTokenHealth(input) {
			calls.claims.push(input);
			claimFinished = true;
			return { kind: "claimed", claim: claim() };
		},
		async commitRefreshedTokens(input) {
			calls.commits.push(input);
			expect(providerStarted).toBe(true);
			return { kind: "committed", connectionRevision: 7 };
		},
		async settleTokenHealth(input) {
			calls.settlements.push(input);
			return {
				kind: "settled",
				connectionRevision:
					input.connectionRevision +
					(input.incrementConnectionRevision ? 1 : 0),
			};
		},
		...overrides,
	};
	return {
		api,
		calls,
		providerStarted: () => providerStarted,
		markProviderStarted() {
			expect(claimFinished).toBe(true);
			providerStarted = true;
		},
	};
}

function adapter(onRefresh: (tokens: MailboxTokenSet) => MailboxTokenSet) {
	const api = {
		provider: "gmail" as const,
		async refreshTokens({ tokens }: { tokens: MailboxTokenSet }) {
			return onRefresh(tokens);
		},
		async createAuthorizationUrl() {
			throw new Error("not-used");
		},
		async exchangeAuthorizationCode() {
			throw new Error("not-used");
		},
		async revoke() {
			throw new Error("not-used");
		},
		async listMessages() {
			throw new Error("not-used");
		},
		async getMessage() {
			throw new Error("not-used");
		},
	} satisfies SalesRequestMailboxAdapter;
	return api;
}

describe("mailbox token refresh and health lifecycle", () => {
	test("refreshes outside the claim transaction and commits separately encrypted credentials with revision fences", async () => {
		const persistence = store();
		const provider = adapter((tokens) => {
			persistence.markProviderStarted();
			expect(tokens).toEqual({
				accessToken: "old-access",
				refreshToken: "old-refresh",
				expiresAt: new Date(NOW.getTime() + 60_000),
				grantedScopes: SCOPES,
			});
			return {
				accessToken: "new-access",
				refreshToken: "rotated-refresh",
				expiresAt: new Date(NOW.getTime() + 3_600_000),
				grantedScopes: [...SCOPES].reverse(),
			};
		});

		const result = await runMailboxTokenHealthLifecycle(
			{
				connectionId: CONNECTION_ID,
				expectedConnectionRevision: 6,
				operationId: OPERATION_ID,
				reason: "token-expiring",
				now: NOW,
			},
			{
				store: persistence.api,
				adapters: { gmail: provider },
				keyRing: {
					resolve: () => KEY,
					active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
				},
				clock: () => NOW,
			},
		);

		expect(result).toEqual({ kind: "healthy", connectionRevision: 7 });
		expect(persistence.calls.claims).toHaveLength(1);
		const commit = persistence.calls.commits[0] as Parameters<
			MailboxTokenHealthStore["commitRefreshedTokens"]
		>[0];
		expect(commit).toMatchObject({
			operationId: OPERATION_ID,
			leaseId: "lease-1",
			leaseEpoch: 3,
			connectionId: CONNECTION_ID,
			connectionRevision: 6,
			organizationId: 10,
			ownerUserId: 20,
			officeAuthorityKey: "office-authority-v1:canonical-role-evidence",
			authorityRevision: "authority-7",
			policyRevision: 4,
			credentials: {
				grantedScopes: [...SCOPES].sort(),
				scopeFingerprint: claim().scopeFingerprint,
				tokenExpiresAt: new Date(NOW.getTime() + 3_600_000),
			},
			health: {
				status: "healthy",
				checkedAt: NOW,
				refreshedAt: NOW,
				errorCode: null,
				nextAttemptAt: null,
				retryAttempt: 0,
			},
			commitBehavior: {
				incrementConnectionRevision: true,
				invalidatePriorRevisionWork: true,
				preservePreferences: true,
				preserveSourceSelections: true,
				preserveCursors: true,
				preserveSubscriptions: true,
			},
		});
		expect(
			decryptMailboxSecret({
				envelope: commit.credentials.accessToken,
				resolveKey: () => ACTIVE_KEY,
				binding: `${CONNECTION_ID}:access-token`,
			}),
		).toBe("new-access");
		expect(
			decryptMailboxSecret({
				envelope: commit.credentials.refreshToken,
				resolveKey: () => ACTIVE_KEY,
				binding: `${CONNECTION_ID}:refresh-token`,
			}),
		).toBe("rotated-refresh");
		expect(JSON.stringify({ result, commit })).not.toContain("new-access");
		expect(JSON.stringify({ result, commit })).not.toContain("rotated-refresh");
	});

	test("preserves the durable refresh credential when the provider does not rotate it", async () => {
		const persistence = store();
		const provider = adapter((tokens) => {
			persistence.markProviderStarted();
			expect(tokens.refreshToken).toBe("old-refresh");
			return {
				accessToken: "new-access",
				expiresAt: new Date(NOW.getTime() + 3_600_000),
				grantedScopes: SCOPES,
			};
		});
		const result = await runMailboxTokenHealthLifecycle(
			{
				connectionId: CONNECTION_ID,
				expectedConnectionRevision: 6,
				operationId: OPERATION_ID,
				reason: "forced-health-check",
				now: NOW,
			},
			{
				store: persistence.api,
				adapters: { gmail: provider },
				keyRing: {
					resolve: () => KEY,
					active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
				},
				clock: () => NOW,
			},
		);
		expect(result.kind).toBe("healthy");
		const commit = persistence.calls.commits[0] as Parameters<
			MailboxTokenHealthStore["commitRefreshedTokens"]
		>[0];
		expect(
			decryptMailboxSecret({
				envelope: commit.credentials.refreshToken,
				resolveKey: () => ACTIVE_KEY,
				binding: `${CONNECTION_ID}:refresh-token`,
			}),
		).toBe("old-refresh");
	});

	test("uses bounded claim inputs and replays terminal outcomes without provider access", async () => {
		let providerCalls = 0;
		for (const claimed of [
			{ kind: "not-due" as const },
			{ kind: "lease-contended" as const },
			{
				kind: "completed" as const,
				outcome: "healthy" as const,
				connectionRevision: 7,
			},
		]) {
			const persistence = store({
				async claimTokenHealth(input) {
					persistence.calls.claims.push(input);
					return claimed;
				},
			});
			const result = await runMailboxTokenHealthLifecycle(
				{
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
					operationId: OPERATION_ID,
					reason: "forced-health-check",
					now: NOW,
				},
				{
					store: persistence.api,
					adapters: {
						gmail: adapter(() => {
							providerCalls += 1;
							throw new Error("must-not-run");
						}),
					},
					keyRing: {
						resolve: () => KEY,
						active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
					},
					clock: () => NOW,
				},
			);
			expect(result.kind).toBe(
				claimed.kind === "completed" ? "healthy" : claimed.kind,
			);
			expect(persistence.calls.claims[0]).toEqual({
				connectionId: CONNECTION_ID,
				expectedConnectionRevision: 6,
				operationId: OPERATION_ID,
				reason: "forced-health-check",
				now: NOW,
				leaseDurationMs: MAILBOX_TOKEN_HEALTH_LEASE_MS,
				refreshBeforeExpiryMs: MAILBOX_TOKEN_REFRESH_BEFORE_EXPIRY_MS,
				maxRetryAttempts: MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS,
			});
		}
		expect(providerCalls).toBe(0);
	});

	test("durably blocks sync when provider authorization is revoked without storing raw evidence", async () => {
		const persistence = store();
		const provider = adapter(() => {
			persistence.markProviderStarted();
			throw new MailboxProviderError({
				provider: "gmail",
				code: "authorization-revoked",
			});
		});
		const result = await runMailboxTokenHealthLifecycle(
			{
				connectionId: CONNECTION_ID,
				expectedConnectionRevision: 6,
				operationId: OPERATION_ID,
				reason: "token-expiring",
				now: NOW,
			},
			{
				store: persistence.api,
				adapters: { gmail: provider },
				keyRing: {
					resolve: () => KEY,
					active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
				},
				clock: () => NOW,
			},
		);
		expect(result).toEqual({
			kind: "reauthorization-required",
			connectionRevision: 7,
		});
		expect(persistence.calls.settlements).toEqual([
			expect.objectContaining({
				status: "reauthorization-required",
				errorCode: "authorization-revoked",
				checkedAt: NOW,
				nextAttemptAt: null,
				blockSync: true,
				incrementConnectionRevision: true,
				invalidatePriorRevisionWork: true,
				preservePreferences: true,
				preserveSourceSelections: true,
				preserveCursors: true,
				preserveSubscriptions: true,
			}),
		]);
		expect(
			JSON.stringify({ result, evidence: persistence.calls.settlements }),
		).not.toContain("old-access");
		expect(
			JSON.stringify({ result, evidence: persistence.calls.settlements }),
		).not.toContain("old-refresh");
	});

	test("schedules bounded retry metadata and dead-letters after the retry budget", async () => {
		for (const retryAttempt of [0, 4]) {
			const persistence = store({
				async claimTokenHealth() {
					return { kind: "claimed", claim: claim({ retryAttempt }) };
				},
			});
			const provider = adapter(() => {
				throw new MailboxProviderError({
					provider: "gmail",
					code: "rate-limited",
					retryAfterMs: 30_000,
				});
			});
			const result = await runMailboxTokenHealthLifecycle(
				{
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
					operationId: OPERATION_ID,
					reason: "token-expiring",
					now: NOW,
				},
				{
					store: persistence.api,
					adapters: { gmail: provider },
					keyRing: {
						resolve: () => KEY,
						active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
					},
					clock: () => NOW,
				},
			);
			if (retryAttempt === 0) {
				expect(result).toEqual({
					kind: "retry-scheduled",
					nextAttemptAt: new Date(NOW.getTime() + 30_000),
				});
				expect(persistence.calls.settlements[0]).toMatchObject({
					status: "temporarily-unavailable",
					errorCode: "rate-limited",
					retryAttempt: 1,
					nextAttemptAt: new Date(NOW.getTime() + 30_000),
					blockSync: false,
					incrementConnectionRevision: false,
					invalidatePriorRevisionWork: false,
				});
			} else {
				expect(result).toEqual({
					kind: "dead-lettered",
					connectionRevision: 7,
				});
				expect(persistence.calls.settlements[0]).toMatchObject({
					status: "dead-lettered",
					errorCode: "rate-limited",
					retryAttempt: MAILBOX_TOKEN_HEALTH_MAX_RETRY_ATTEMPTS,
					blockSync: true,
				});
			}
		}
	});

	test("dead-letters provider retry delays beyond the bounded scheduling window", async () => {
		const persistence = store();
		const result = await runMailboxTokenHealthLifecycle(
			{
				connectionId: CONNECTION_ID,
				expectedConnectionRevision: 6,
				operationId: OPERATION_ID,
				reason: "token-expiring",
				now: NOW,
			},
			{
				store: persistence.api,
				adapters: {
					gmail: adapter(() => {
						persistence.markProviderStarted();
						throw new MailboxProviderError({
							provider: "gmail",
							code: "provider-unavailable",
							retryAfterMs: 15 * 60_000 + 1,
						});
					}),
				},
				keyRing: {
					resolve: () => KEY,
					active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
				},
				clock: () => NOW,
			},
		);
		expect(result).toEqual({
			kind: "dead-lettered",
			connectionRevision: 7,
		});
		expect(persistence.calls.settlements[0]).toMatchObject({
			status: "dead-lettered",
			errorCode: "provider-unavailable",
			nextAttemptAt: null,
		});
	});

	test("maps scope downgrade and account mismatch to terminal reauthorization", async () => {
		for (const mode of ["scope", "account"] as const) {
			const persistence = store();
			const provider = adapter(() => {
				persistence.markProviderStarted();
				if (mode === "account") {
					throw new MailboxProviderError({
						provider: "gmail",
						code: "account-mismatch",
					});
				}
				return {
					accessToken: "new-access",
					refreshToken: "old-refresh",
					expiresAt: new Date(NOW.getTime() + 3_600_000),
					grantedScopes: [SCOPES[0]],
				};
			});
			const result = await runMailboxTokenHealthLifecycle(
				{
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
					operationId: OPERATION_ID,
					reason: "token-expiring",
					now: NOW,
				},
				{
					store: persistence.api,
					adapters: { gmail: provider },
					keyRing: {
						resolve: () => KEY,
						active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
					},
					clock: () => NOW,
				},
			);
			expect(result.kind).toBe("reauthorization-required");
			expect(persistence.calls.settlements[0]).toMatchObject({
				status: "reauthorization-required",
				errorCode: mode === "scope" ? "scope-mismatch" : "account-mismatch",
				blockSync: true,
			});
		}
	});

	test("dead-letters provider mismatch, malformed results, unknown failures, and credential key failures safely", async () => {
		const cases: Array<{
			name: string;
			provider?: SalesRequestMailboxAdapter;
			keyRing?: {
				resolve(keyVersion: string): Buffer;
				active(): { keyVersion: string; key: Buffer };
			};
			errorCode: string;
		}> = [
			{
				name: "provider mismatch",
				provider: {
					...adapter(() => {
						throw new Error("not-used");
					}),
					provider: "microsoft-graph",
				},
				errorCode: "provider-mismatch",
			},
			{
				name: "malformed result",
				provider: adapter(() => ({
					accessToken: "",
					refreshToken: "old-refresh",
					expiresAt: new Date(NOW.getTime() + 3_600_000),
					grantedScopes: SCOPES,
				})),
				errorCode: "malformed-response",
			},
			{
				name: "unknown provider failure",
				provider: adapter(() => {
					throw new Error("raw-provider-secret");
				}),
				errorCode: "internal-failure",
			},
			{
				name: "unknown key",
				provider: adapter(() => {
					throw new Error("not-used");
				}),
				keyRing: {
					resolve() {
						throw new Error("raw-key-secret");
					},
					active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
				},
				errorCode: "credentials-unavailable",
			},
			{
				name: "active key unavailable",
				provider: adapter(() => ({
					accessToken: "new-access",
					refreshToken: "old-refresh",
					expiresAt: new Date(NOW.getTime() + 3_600_000),
					grantedScopes: SCOPES,
				})),
				keyRing: {
					resolve: () => KEY,
					active() {
						throw new Error("raw-active-key-secret");
					},
				},
				errorCode: "credentials-unavailable",
			},
		];
		for (const item of cases) {
			const persistence = store();
			const result = await runMailboxTokenHealthLifecycle(
				{
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
					operationId: OPERATION_ID,
					reason: "token-expiring",
					now: NOW,
				},
				{
					store: persistence.api,
					adapters: { gmail: item.provider as SalesRequestMailboxAdapter },
					keyRing: item.keyRing ?? {
						resolve: () => KEY,
						active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
					},
					clock: () => NOW,
				},
			);
			expect(result.kind, item.name).toBe("dead-lettered");
			expect(persistence.calls.settlements[0]).toMatchObject({
				status: "dead-lettered",
				errorCode: item.errorCode,
				blockSync: true,
			});
			expect(JSON.stringify(persistence.calls.settlements)).not.toContain(
				"raw-",
			);
		}
	});

	test("does not commit after lease expiry or after a CAS/store failure", async () => {
		for (const failure of ["expired", "commit-throw", "claim-lost"] as const) {
			const persistence = store(
				failure === "commit-throw"
					? {
							async commitRefreshedTokens() {
								throw new Error("storage-secret");
							},
						}
					: failure === "claim-lost"
						? {
								async commitRefreshedTokens() {
									return { kind: "claim-lost" };
								},
							}
						: {},
			);
			let clockReads = 0;
			const result = await runMailboxTokenHealthLifecycle(
				{
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
					operationId: OPERATION_ID,
					reason: "token-expiring",
				},
				{
					store: persistence.api,
					adapters: {
						gmail: adapter(() => ({
							accessToken: "new-access",
							refreshToken: "old-refresh",
							expiresAt: new Date(NOW.getTime() + 3_600_000),
							grantedScopes: SCOPES,
						})),
					},
					keyRing: {
						resolve: () => KEY,
						active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
					},
					clock: () => {
						clockReads += 1;
						return failure === "expired" && clockReads > 1
							? new Date(NOW.getTime() + MAILBOX_TOKEN_HEALTH_LEASE_MS)
							: NOW;
					},
				},
			);
			expect(result).toEqual(
				failure === "expired"
					? { kind: "lease-lost" }
					: { kind: "lease-contended" },
			);
			if (failure === "expired")
				expect(persistence.calls.commits).toHaveLength(0);
		}
	});

	test("does not settle a provider error after its lease expires", async () => {
		const persistence = store();
		const result = await runMailboxTokenHealthLifecycle(
			{
				connectionId: CONNECTION_ID,
				expectedConnectionRevision: 6,
				operationId: OPERATION_ID,
				reason: "token-expiring",
				now: NOW,
			},
			{
				store: persistence.api,
				adapters: {
					gmail: adapter(() => {
						throw new MailboxProviderError({
							provider: "gmail",
							code: "network",
						});
					}),
				},
				keyRing: {
					resolve: () => KEY,
					active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
				},
				clock: () => new Date(NOW.getTime() + MAILBOX_TOKEN_HEALTH_LEASE_MS),
			},
		);
		expect(result).toEqual({ kind: "lease-lost" });
		expect(persistence.calls.settlements).toHaveLength(0);
		expect(persistence.calls.commits).toHaveLength(0);
	});

	test("rejects impossible store revision transitions after commit or settlement", async () => {
		const healthyStore = store({
			async commitRefreshedTokens() {
				return { kind: "committed", connectionRevision: 6 };
			},
		});
		const healthyResult = await runMailboxTokenHealthLifecycle(
			{
				connectionId: CONNECTION_ID,
				expectedConnectionRevision: 6,
				operationId: OPERATION_ID,
				reason: "token-expiring",
				now: NOW,
			},
			{
				store: healthyStore.api,
				adapters: {
					gmail: adapter(() => ({
						accessToken: "new-access",
						refreshToken: "old-refresh",
						expiresAt: new Date(NOW.getTime() + 3_600_000),
						grantedScopes: SCOPES,
					})),
				},
				keyRing: {
					resolve: () => KEY,
					active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
				},
				clock: () => NOW,
			},
		);
		expect(healthyResult).toEqual({ kind: "lease-contended" });

		const terminalStore = store({
			async settleTokenHealth() {
				return { kind: "settled", connectionRevision: 6 };
			},
		});
		const terminalResult = await runMailboxTokenHealthLifecycle(
			{
				connectionId: CONNECTION_ID,
				expectedConnectionRevision: 6,
				operationId: OPERATION_ID,
				reason: "token-expiring",
				now: NOW,
			},
			{
				store: terminalStore.api,
				adapters: {
					gmail: adapter(() => {
						throw new MailboxProviderError({
							provider: "gmail",
							code: "authorization-revoked",
						});
					}),
				},
				keyRing: {
					resolve: () => KEY,
					active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
				},
				clock: () => NOW,
			},
		);
		expect(terminalResult).toEqual({ kind: "lease-contended" });
	});

	test("returns cancelled before claiming when the caller is already cancelled", async () => {
		const persistence = store();
		const cancellation = new AbortController();
		cancellation.abort(new Error("caller-secret"));

		expect(
			await runMailboxTokenHealthLifecycle(
				{
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
					operationId: OPERATION_ID,
					reason: "token-expiring",
					now: NOW,
					signal: cancellation.signal,
				},
				{
					store: persistence.api,
					adapters: {
						gmail: adapter(() => {
							throw new Error("provider-must-not-run");
						}),
					},
					keyRing: {
						resolve: () => KEY,
						active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
					},
				},
			),
		).toEqual({ kind: "cancelled" });
		expect(persistence.calls.claims).toHaveLength(0);
		expect(persistence.calls.commits).toHaveLength(0);
		expect(persistence.calls.settlements).toHaveLength(0);
	});

	test("returns lease-lost when no provider-dispatch reserve remains", async () => {
		const persistence = store();
		let providerCalls = 0;

		expect(
			await runMailboxTokenHealthLifecycle(
				{
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
					operationId: OPERATION_ID,
					reason: "token-expiring",
					now: NOW,
				},
				{
					store: persistence.api,
					adapters: {
						gmail: adapter(() => {
							providerCalls += 1;
							throw new Error("provider-must-not-run");
						}),
					},
					keyRing: {
						resolve: () => KEY,
						active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
					},
					clock: () => new Date(NOW.getTime() + MAILBOX_TOKEN_HEALTH_LEASE_MS),
				},
			),
		).toEqual({ kind: "lease-lost" });
		expect(providerCalls).toBe(0);
		expect(persistence.calls.commits).toHaveLength(0);
		expect(persistence.calls.settlements).toHaveLength(0);
	});

	test("fails closed on post-dispatch cancellation without consuming retry", async () => {
		const persistence = store();
		const cancellation = new AbortController();
		const provider = adapter(() => {
			persistence.markProviderStarted();
			cancellation.abort(new Error("caller-secret"));
			return {
				accessToken: "must-not-commit",
				refreshToken: "must-not-commit",
				expiresAt: new Date(NOW.getTime() + 3_600_000),
				grantedScopes: SCOPES,
			};
		});

		expect(
			await runMailboxTokenHealthLifecycle(
				{
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
					operationId: OPERATION_ID,
					reason: "token-expiring",
					now: NOW,
					signal: cancellation.signal,
				},
				{
					store: persistence.api,
					adapters: { gmail: provider },
					keyRing: {
						resolve: () => KEY,
						active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
					},
					clock: () => NOW,
				},
			),
		).toEqual({ kind: "reauthorization-required", connectionRevision: 7 });
		expect(persistence.calls.commits).toHaveLength(0);
		expect(persistence.calls.settlements).toEqual([
			expect.objectContaining({
				status: "reauthorization-required",
				errorCode: "refresh-outcome-unknown",
				retryAttempt: 0,
				blockSync: true,
			}),
		]);
		expect(JSON.stringify(persistence.calls.settlements)).not.toContain(
			"secret",
		);
		expect(JSON.stringify(persistence.calls.commits)).not.toContain(
			"must-not-commit",
		);
	});

	test("fails closed on provider timeout and reports lease expiry as lease-lost", async () => {
		for (const mode of ["timeout", "lease"] as const) {
			const persistence = store();
			const provider = adapter(() => {
				persistence.markProviderStarted();
				if (mode === "timeout") {
					throw new MailboxProviderError({
						provider: "gmail",
						code: "network",
						requestFailure: "request-timeout",
					});
				}
				throw new MailboxProviderRequestAbort({
					provider: "gmail",
					reason: "lease-expired",
				});
			});

			const result = await runMailboxTokenHealthLifecycle(
				{
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
					operationId: OPERATION_ID,
					reason: "token-expiring",
					now: NOW,
				},
				{
					store: persistence.api,
					adapters: { gmail: provider },
					keyRing: {
						resolve: () => KEY,
						active: () => ({ keyVersion: "k2", key: ACTIVE_KEY }),
					},
					clock: () => NOW,
				},
			);
			expect(result).toEqual(
				mode === "lease"
					? { kind: "lease-lost" }
					: { kind: "reauthorization-required", connectionRevision: 7 },
			);
			expect(persistence.calls.commits).toHaveLength(0);
			expect(persistence.calls.settlements).toEqual([
				expect.objectContaining({
					status: "reauthorization-required",
					errorCode: "refresh-outcome-unknown",
					retryAttempt: 0,
				}),
			]);
		}
	});
});
