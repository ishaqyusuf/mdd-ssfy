import { describe, expect, test } from "bun:test";
import type {
	MailboxAccountIdentity,
	MailboxTokenSet,
	SalesRequestMailboxAdapter,
} from "./adapter";
import {
	type MailboxConnectionConsumedAttempt,
	type MailboxConnectionLifecycleDependencies,
	type MailboxConnectionLifecycleStore,
	buildMailboxScopeFingerprint,
	completeMailboxConnection,
	startMailboxConnection,
} from "./connection-lifecycle";
import {
	MAILBOX_PROVIDER_AUTHORIZATION,
	type MailboxProvider,
} from "./contracts";
import { decryptMailboxSecret } from "./crypto";
import { MailboxProviderError } from "./errors";
import { digestMailboxOAuthState } from "./oauth-state";

const NOW = new Date("2026-09-13T12:00:00.000Z");
const STATE = "s".repeat(43);
const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";
const KEY = Buffer.alloc(32, 7);

function policy(overrides: Record<string, unknown> = {}) {
	return {
		enabled: true,
		supportedProviders: ["gmail", "microsoft-graph"],
		eligibleUserIds: [20],
		retentionDays: 30,
		maximumAutomationMode: "manual",
		emergencyDisabled: false,
		allowAttachments: false,
		maxAttachmentBytes: 0,
		revision: 4,
		changedAt: "2026-09-13T00:00:00.000Z",
		...overrides,
	};
}

function authority(overrides: Record<string, unknown> = {}) {
	return {
		ownerUserId: 20,
		employeeProfileId: 30,
		organizationId: 10,
		officeAuthorityKey: "office-authority-v1:canonical-role-evidence",
		authorityRevision: "authority-7",
		salesSettingsId: 3,
		salesSettingsRevision: 9,
		policy: policy(),
		providerEligible: true,
		...overrides,
	};
}

function attempt(
	overrides: Partial<MailboxConnectionConsumedAttempt> = {},
): MailboxConnectionConsumedAttempt {
	return {
		stateDigest: digestMailboxOAuthState(STATE),
		organizationId: 10,
		ownerUserId: 20,
		employeeProfileId: 30,
		officeAuthorityKey: "office-authority-v1:canonical-role-evidence",
		provider: "gmail",
		redirectKey: "sales-settings-mailbox",
		issuedAt: NOW,
		expiresAt: new Date(NOW.getTime() + 10 * 60_000),
		salesSettingsId: 3,
		salesSettingsRevision: 9,
		policyRevision: 4,
		authorityRevision: "authority-7",
		consumedAt: NOW,
		...overrides,
	};
}

function tokens(
	provider: MailboxProvider = "gmail",
	overrides: Partial<MailboxTokenSet> = {},
): MailboxTokenSet {
	return {
		accessToken: "access-secret",
		refreshToken: "refresh-secret",
		expiresAt: new Date("2026-09-13T13:00:00.000Z"),
		grantedScopes: MAILBOX_PROVIDER_AUTHORIZATION[provider].scopes,
		...overrides,
	};
}

function account(
	provider: MailboxProvider = "gmail",
	overrides: Partial<MailboxAccountIdentity> = {},
): MailboxAccountIdentity {
	return {
		provider,
		providerAccountId: "provider-account-1",
		email: "Rep@Example.com",
		displayName: "Sales Rep",
		...overrides,
	};
}

function adapter(
	provider: MailboxProvider = "gmail",
	exchange:
		| { tokens: MailboxTokenSet; account: MailboxAccountIdentity }
		| Error = { tokens: tokens(provider), account: account(provider) },
) {
	const calls = {
		states: [] as string[],
		codes: [] as string[],
		revocations: [] as MailboxTokenSet[],
	};
	const api: SalesRequestMailboxAdapter = {
		provider,
		async createAuthorizationUrl({ state }) {
			calls.states.push(state);
			return `https://provider.example/fixed?state=${state}`;
		},
		async exchangeAuthorizationCode({ code }) {
			calls.codes.push(code);
			if (exchange instanceof Error) throw exchange;
			return exchange;
		},
		async revoke({ tokens }) {
			calls.revocations.push(tokens);
		},
		async refreshTokens() {
			throw new Error("not-used");
		},
		async listMessages() {
			throw new Error("not-used");
		},
		async getMessage() {
			throw new Error("not-used");
		},
	};
	return { api, calls };
}

function store(overrides: Partial<MailboxConnectionLifecycleStore> = {}) {
	const calls = {
		resolved: [] as unknown[],
		attempts: [] as unknown[],
		consumed: [] as unknown[],
		prepared: [] as unknown[],
		committed: [] as unknown[],
		terminal: [] as unknown[],
	};
	const api: MailboxConnectionLifecycleStore = {
		async resolveStartAuthority(input) {
			calls.resolved.push(input);
			return { kind: "authorized", authority: authority() };
		},
		async createAttempt(input) {
			calls.attempts.push(input);
			return { kind: "created" };
		},
		async consumeCallbackAttempt(input) {
			calls.consumed.push(input);
			return { kind: "ready", attempt: attempt() };
		},
		async prepareConnectionTarget(input) {
			calls.prepared.push(input);
			return {
				kind: "prepared",
				target: { kind: "new", connectionId: CONNECTION_ID },
			};
		},
		async commitConnection(input) {
			calls.committed.push(input);
			return {
				kind: "committed",
				connectionId: input.target.connectionId,
				connectionRevision: 1,
			};
		},
		async terminalizeAttempt(input) {
			calls.terminal.push(input);
		},
		...overrides,
	};
	return { api, calls };
}

function deps(
	persistence = store(),
	provider = adapter(),
): MailboxConnectionLifecycleDependencies {
	return {
		store: persistence.api,
		adapters: { [provider.api.provider]: provider.api },
		clock: () => NOW,
		createConnectionId: () => CONNECTION_ID,
		keyRing: { active: () => ({ keyVersion: "k1", key: KEY }) },
	};
}

const callback = {
	actorUserId: 20,
	provider: "gmail",
	redirectKey: "sales-settings-mailbox",
	state: STATE,
	result: { kind: "code", code: "authorization-code-secret" },
} as const;

const startInput = {
	actorUserId: 20,
	provider: "gmail",
	redirectKey: "sales-settings-mailbox",
} as const;

describe("mailbox connection lifecycle start", () => {
	test("persists digest-only server authority and returns the fixed provider URL", async () => {
		const persistence = store();
		const provider = adapter();
		const result = await startMailboxConnection(
			{ ...startInput, now: NOW },
			{ store: persistence.api, adapters: { gmail: provider.api } },
		);
		expect(result).toEqual({
			kind: "authorization-ready",
			authorizationUrl: `https://provider.example/fixed?state=${provider.calls.states[0]}`,
		});
		expect(provider.calls.states[0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(persistence.calls.attempts[0]).toMatchObject({
			organizationId: 10,
			ownerUserId: 20,
			employeeProfileId: 30,
			officeAuthorityKey: "office-authority-v1:canonical-role-evidence",
			salesSettingsId: 3,
			salesSettingsRevision: 9,
			policyRevision: 4,
			authorityRevision: "authority-7",
			consumedAt: null,
		});
		expect(JSON.stringify(persistence.calls.attempts)).not.toContain(
			String(provider.calls.states[0]),
		);
		expect(JSON.stringify(persistence.calls.attempts)).not.toContain(
			"officeMembershipId",
		);
	});

	test("rejects employee, office, and policy gates without creating an attempt", async () => {
		for (const reason of [
			"employee-inactive",
			"profile-inactive",
			"office-unavailable",
		] as const) {
			const persistence = store({
				async resolveStartAuthority() {
					return { kind: "rejected", reason };
				},
			});
			const provider = adapter();
			expect(
				await startMailboxConnection(startInput, {
					store: persistence.api,
					adapters: { gmail: provider.api },
				}),
			).toEqual({ kind: "rejected", reason });
			expect(persistence.calls.attempts).toHaveLength(0);
			expect(provider.calls.states).toHaveLength(0);
		}
		const persistence = store({
			async resolveStartAuthority() {
				return {
					kind: "authorized",
					authority: authority({ policy: policy({ enabled: false }) }),
				};
			},
		});
		expect(
			await startMailboxConnection(startInput, {
				store: persistence.api,
				adapters: { gmail: adapter().api },
			}),
		).toEqual({ kind: "rejected", reason: "policy-disabled" });
		expect(persistence.calls.attempts).toHaveLength(0);
	});

	test("rejects blank or unbounded opaque office authority evidence", async () => {
		for (const officeAuthorityKey of ["", "x".repeat(256)]) {
			const persistence = store({
				async resolveStartAuthority() {
					return {
						kind: "authorized",
						authority: authority({ officeAuthorityKey }),
					};
				},
			});
			const provider = adapter();
			expect(
				await startMailboxConnection(startInput, {
					store: persistence.api,
					adapters: { gmail: provider.api },
				}),
			).toEqual({ kind: "rejected", reason: "invalid-authority" });
			expect(persistence.calls.attempts).toHaveLength(0);
			expect(provider.calls.states).toHaveLength(0);
		}
	});

	test("accepts no client organization, owner, redirect URI, or provider identity", async () => {
		const persistence = store();
		await startMailboxConnection(
			{
				actorUserId: 20,
				provider: "gmail",
				redirectKey: "sales-request-inbox",
				now: NOW,
			},
			{ store: persistence.api, adapters: { gmail: adapter().api } },
		);
		expect(persistence.calls.resolved).toEqual([
			{ actorUserId: 20, provider: "gmail", now: NOW },
		]);
		expect(persistence.calls.attempts[0]).toMatchObject({
			redirectKey: "sales-request-inbox",
			organizationId: 10,
			ownerUserId: 20,
		});
	});
});

describe("mailbox connection lifecycle callback", () => {
	test("rejects missing session and malformed state before storage or provider", async () => {
		const persistence = store();
		const provider = adapter();
		expect(
			await completeMailboxConnection(
				{ ...callback, actorUserId: null },
				deps(persistence, provider),
			),
		).toEqual({ kind: "rejected", reason: "missing-session" });
		expect(
			await completeMailboxConnection(
				{ ...callback, state: "malformed" },
				deps(persistence, provider),
			),
		).toEqual({ kind: "rejected", reason: "invalid-attempt" });
		expect(persistence.calls.consumed).toHaveLength(0);
		expect(provider.calls.codes).toHaveLength(0);
	});

	test("rejects invalid opaque office authority evidence before exchange", async () => {
		for (const officeAuthorityKey of ["", "x".repeat(256)]) {
			const persistence = store({
				async consumeCallbackAttempt() {
					return {
						kind: "ready",
						attempt: attempt({ officeAuthorityKey }),
					};
				},
			});
			const provider = adapter();
			expect(
				await completeMailboxConnection(callback, deps(persistence, provider)),
			).toEqual({ kind: "rejected", reason: "invalid-attempt" });
			expect(provider.calls.codes).toHaveLength(0);
		}
	});

	test("wrong actor, provider, or redirect cannot consume another attempt", async () => {
		let consumed = false;
		const persistence = store({
			async consumeCallbackAttempt(input) {
				if (
					input.actorUserId !== 20 ||
					input.provider !== "gmail" ||
					input.redirectKey !== "sales-settings-mailbox"
				) {
					return { kind: "mismatch" };
				}
				if (consumed) return { kind: "already-consumed" };
				consumed = true;
				return { kind: "ready", attempt: attempt() };
			},
		});
		const gmail = adapter();
		const graph = adapter("microsoft-graph");
		const dependencies = {
			...deps(persistence, gmail),
			adapters: { gmail: gmail.api, "microsoft-graph": graph.api },
		};
		for (const input of [
			{ ...callback, actorUserId: 99 },
			{ ...callback, provider: "microsoft-graph" as const },
			{ ...callback, redirectKey: "sales-request-inbox" as const },
		]) {
			expect(await completeMailboxConnection(input, dependencies)).toEqual({
				kind: "rejected",
				reason: "invalid-attempt",
			});
		}
		expect(
			await completeMailboxConnection(callback, dependencies),
		).toMatchObject({ kind: "connected" });
		expect(gmail.calls.codes).toHaveLength(1);
		expect(graph.calls.codes).toHaveLength(0);
	});

	test("expired, replayed, and concurrent callbacks never exchange twice", async () => {
		for (const reason of ["expired", "already-consumed"] as const) {
			const persistence = store({
				async consumeCallbackAttempt() {
					return reason === "expired"
						? { kind: "terminal", reason }
						: { kind: reason };
				},
			});
			const provider = adapter();
			expect(
				await completeMailboxConnection(callback, deps(persistence, provider)),
			).toEqual({
				kind: "rejected",
				reason: reason === "expired" ? "expired" : "invalid-attempt",
			});
			expect(provider.calls.codes).toHaveLength(0);
		}
		let claimed = false;
		const persistence = store({
			async consumeCallbackAttempt() {
				if (claimed) return { kind: "already-consumed" };
				claimed = true;
				return { kind: "ready", attempt: attempt() };
			},
		});
		const provider = adapter();
		const results = await Promise.all([
			completeMailboxConnection(callback, deps(persistence, provider)),
			completeMailboxConnection(callback, deps(persistence, provider)),
		]);
		expect(results.map((result) => result.kind).sort()).toEqual([
			"connected",
			"rejected",
		]);
		expect(provider.calls.codes).toHaveLength(1);
	});

	test("cancellation consumes terminal without an exchange", async () => {
		const persistence = store({
			async consumeCallbackAttempt(input) {
				expect(input.callbackKind).toBe("cancelled");
				return { kind: "cancelled" };
			},
		});
		const provider = adapter();
		expect(
			await completeMailboxConnection(
				{ ...callback, result: { kind: "cancelled" } },
				deps(persistence, provider),
			),
		).toEqual({ kind: "cancelled" });
		expect(provider.calls.codes).toHaveLength(0);
	});

	test("requires immutable identity, durable refresh, and exact read-only scopes", async () => {
		const invalid = [
			{ tokens: tokens(), account: account("microsoft-graph") },
			{
				tokens: tokens("gmail", { refreshToken: undefined }),
				account: account(),
			},
			{
				tokens: tokens("gmail", {
					grantedScopes: [MAILBOX_PROVIDER_AUTHORIZATION.gmail.scopes[0]],
				}),
				account: account(),
			},
			...["gmail.modify", "gmail.compose", "gmail.send"].map((scope) => ({
				tokens: tokens("gmail", {
					grantedScopes: [
						...MAILBOX_PROVIDER_AUTHORIZATION.gmail.scopes,
						`https://www.googleapis.com/auth/${scope}`,
					],
				}),
				account: account(),
			})),
		];
		for (const exchange of invalid) {
			const persistence = store();
			const provider = adapter("gmail", exchange);
			expect(
				await completeMailboxConnection(callback, deps(persistence, provider)),
			).toEqual({ kind: "provider-response-invalid" });
			expect(provider.calls.revocations).toHaveLength(0);
			expect(persistence.calls.committed).toHaveLength(0);
		}
	});

	test("normalizes exact Graph resource scopes with optional offline consent", async () => {
		const expectedFingerprint = buildMailboxScopeFingerprint({
			provider: "microsoft-graph",
			scopes: ["mail.read", "user.read"],
		});
		for (const grantedScopes of [
			["https://graph.microsoft.com/User.Read", "MAIL.READ"],
			["Mail.Read", "offline_access", "User.Read"],
		]) {
			const provider = adapter("microsoft-graph", {
				tokens: tokens("microsoft-graph", { grantedScopes }),
				account: account("microsoft-graph"),
			});
			const persistence = store({
				async consumeCallbackAttempt() {
					return {
						kind: "ready",
						attempt: attempt({ provider: "microsoft-graph" }),
					};
				},
			});
			expect(
				await completeMailboxConnection(
					{ ...callback, provider: "microsoft-graph" },
					deps(persistence, provider),
				),
			).toMatchObject({ kind: "connected" });
			expect(persistence.calls.prepared[0]).toMatchObject({
				scopeFingerprint: expectedFingerprint,
			});
			expect(persistence.calls.committed[0]).toMatchObject({
				connection: {
					grantedScopes: ["mail.read", "user.read"],
					scopeFingerprint: expectedFingerprint,
				},
			});
		}
	});

	test("rejects extra Graph write and send resource scopes without revoking", async () => {
		for (const extraScope of ["Mail.ReadWrite", "Mail.Send"]) {
			const provider = adapter("microsoft-graph", {
				tokens: tokens("microsoft-graph", {
					grantedScopes: ["Mail.Read", "User.Read", extraScope],
				}),
				account: account("microsoft-graph"),
			});
			const persistence = store({
				async consumeCallbackAttempt() {
					return {
						kind: "ready",
						attempt: attempt({ provider: "microsoft-graph" }),
					};
				},
			});
			expect(
				await completeMailboxConnection(
					{ ...callback, provider: "microsoft-graph" },
					deps(persistence, provider),
				),
			).toEqual({ kind: "provider-response-invalid" });
			expect(persistence.calls.committed).toHaveLength(0);
			expect(provider.calls.revocations).toHaveLength(0);
		}
	});

	test("commits envelope-only secrets with separate purpose bindings", async () => {
		const persistence = store();
		const provider = adapter();
		expect(
			await completeMailboxConnection(callback, deps(persistence, provider)),
		).toEqual({
			kind: "connected",
			connectionId: CONNECTION_ID,
			connectionRevision: 1,
			operation: "created",
		});
		const commit = persistence.calls.committed[0] as {
			connection: {
				accessToken: Parameters<typeof decryptMailboxSecret>[0]["envelope"];
			};
			reconnectBehavior: unknown;
		};
		expect(JSON.stringify(commit)).not.toContain("access-secret");
		expect(JSON.stringify(commit)).not.toContain("refresh-secret");
		expect(JSON.stringify(commit)).not.toContain("authorization-code-secret");
		expect(JSON.stringify(commit)).not.toContain(STATE);
		expect(
			decryptMailboxSecret({
				envelope: commit.connection.accessToken,
				resolveKey: () => KEY,
				binding: `${CONNECTION_ID}:access-token`,
			}),
		).toBe("access-secret");
		expect(() =>
			decryptMailboxSecret({
				envelope: commit.connection.accessToken,
				resolveKey: () => KEY,
				binding: `${CONNECTION_ID}:refresh-token`,
			}),
		).toThrow();
		expect(commit.reconnectBehavior).toEqual({
			preserveOwner: true,
			preservePreferences: true,
			incrementRevision: true,
			resetCursor: true,
			resetSubscription: true,
			resetHealthForBoundedRecovery: true,
		});
	});

	test("supports reconnect while preserving owner/preferences", async () => {
		const persistence = store({
			async prepareConnectionTarget(input) {
				return {
					kind: "prepared",
					target: {
						kind: "reconnect",
						connectionId: CONNECTION_ID,
						expectedConnectionRevision: 6,
						expectedScopeFingerprint: input.scopeFingerprint,
					},
				};
			},
			async commitConnection() {
				return {
					kind: "committed",
					connectionId: CONNECTION_ID,
					connectionRevision: 7,
				};
			},
		});
		expect(
			await completeMailboxConnection(callback, deps(persistence, adapter())),
		).toMatchObject({ operation: "reconnected", connectionRevision: 7 });
	});

	test("keeps cross-owner and concurrent uniqueness collisions opaque", async () => {
		for (const phase of ["prepare", "commit"] as const) {
			const persistence = store(
				phase === "prepare"
					? {
							async prepareConnectionTarget() {
								return { kind: "identity-conflict" };
							},
						}
					: {
							async commitConnection() {
								return { kind: "identity-conflict" };
							},
						},
			);
			const provider = adapter();
			expect(
				await completeMailboxConnection(callback, deps(persistence, provider)),
			).toEqual({ kind: "rejected", reason: "connection-unavailable" });
			expect(provider.calls.revocations).toHaveLength(0);
		}
	});

	test("rejects policy/actor and reconnect revision changes after exchange", async () => {
		for (const outcome of [
			{ kind: "authority-changed" },
			{ kind: "connection-changed" },
		] as const) {
			const persistence = store({
				async commitConnection() {
					return outcome;
				},
			});
			const provider = adapter();
			expect(
				await completeMailboxConnection(callback, deps(persistence, provider)),
			).toEqual({ kind: "rejected", reason: outcome.kind });
			expect(provider.calls.revocations).toHaveLength(0);
		}
	});

	test("maps provider failures without exposing raw errors", async () => {
		for (const [code, expected] of [
			["authorization-revoked", "provider-authorization-failed"],
			["rate-limited", "provider-temporarily-unavailable"],
			["malformed-response", "provider-response-invalid"],
		] as const) {
			const persistence = store();
			const provider = adapter(
				"gmail",
				new MailboxProviderError({ provider: "gmail", code }),
			);
			expect(
				await completeMailboxConnection(callback, deps(persistence, provider)),
			).toEqual({ kind: expected });
			expect(JSON.stringify(persistence.calls.terminal)).not.toContain(code);
		}
	});

	test("cleanup failure cannot trigger provisional provider revocation", async () => {
		const persistence = store({
			async prepareConnectionTarget() {
				return { kind: "identity-conflict" };
			},
			async terminalizeAttempt() {
				throw new Error("raw-cleanup-secret");
			},
		});
		const provider = adapter();
		provider.api.revoke = async () => {
			throw new Error("raw-revoke-secret");
		};
		expect(
			await completeMailboxConnection(callback, deps(persistence, provider)),
		).toEqual({ kind: "rejected", reason: "connection-unavailable" });
		expect(provider.calls.revocations).toHaveLength(0);
	});

	test("unknown store errors propagate after cleanup without provider revocation", async () => {
		const failure = new Error("store-bug");
		const persistence = store({
			async commitConnection() {
				throw failure;
			},
		});
		const provider = adapter();
		await expect(
			completeMailboxConnection(callback, deps(persistence, provider)),
		).rejects.toBe(failure);
		expect(provider.calls.revocations).toHaveLength(0);
		expect(persistence.calls.terminal).toHaveLength(1);
	});

	test("bounds exchange by attempt expiry and terminalizes the consumed attempt", async () => {
		const persistence = store({
			async consumeCallbackAttempt() {
				return {
					kind: "ready",
					attempt: attempt({ expiresAt: new Date(NOW.getTime() + 260) }),
				};
			},
		});
		const provider = adapter();
		provider.api.exchangeAuthorizationCode = async ({ code, signal }) => {
			provider.calls.codes.push(code);
			await new Promise<never>((_resolve, reject) => {
				signal?.addEventListener(
					"abort",
					() => reject(new Error("late-secret")),
					{ once: true },
				);
			});
			throw new Error("unreachable");
		};

		expect(
			await completeMailboxConnection(callback, deps(persistence, provider)),
		).toEqual({ kind: "rejected", reason: "expired" });
		expect(provider.calls.codes).toEqual(["authorization-code-secret"]);
		expect(persistence.calls.prepared).toHaveLength(0);
		expect(persistence.calls.committed).toHaveLength(0);
		expect(persistence.calls.terminal).toEqual([
			expect.objectContaining({ reason: "attempt-expired" }),
		]);
		expect(JSON.stringify(persistence.calls.terminal)).not.toContain("secret");
	});

	test("terminalizes caller cancellation without dispatching a pre-cancelled exchange", async () => {
		const persistence = store();
		const provider = adapter();
		const cancellation = new AbortController();
		cancellation.abort(new Error("caller-secret"));

		expect(
			await completeMailboxConnection(
				{ ...callback, signal: cancellation.signal },
				deps(persistence, provider),
			),
		).toEqual({ kind: "cancelled" });
		expect(provider.calls.codes).toHaveLength(0);
		expect(persistence.calls.prepared).toHaveLength(0);
		expect(persistence.calls.committed).toHaveLength(0);
		expect(persistence.calls.terminal).toEqual([
			expect.objectContaining({ reason: "caller-cancelled" }),
		]);
		expect(JSON.stringify(persistence.calls.terminal)).not.toContain(
			"caller-secret",
		);
	});

	test("rechecks attempt expiry immediately before prepare and commit mutations", async () => {
		for (const expiresBefore of ["prepare", "commit"] as const) {
			const expiresAt = new Date(NOW.getTime() + 10_000);
			const persistence = store({
				async consumeCallbackAttempt() {
					return { kind: "ready", attempt: attempt({ expiresAt }) };
				},
			});
			const provider = adapter();
			const result = await completeMailboxConnection(callback, {
				...deps(persistence, provider),
				clock: () => {
					if (expiresBefore === "prepare") {
						return provider.calls.codes.length > 0 ? expiresAt : NOW;
					}
					return persistence.calls.prepared.length > 0 ? expiresAt : NOW;
				},
			});

			expect(result).toEqual({ kind: "rejected", reason: "expired" });
			expect(persistence.calls.prepared).toHaveLength(
				expiresBefore === "prepare" ? 0 : 1,
			);
			expect(persistence.calls.committed).toHaveLength(0);
			expect(persistence.calls.terminal).toEqual([
				expect.objectContaining({ reason: "attempt-expired" }),
			]);
		}
	});
});
