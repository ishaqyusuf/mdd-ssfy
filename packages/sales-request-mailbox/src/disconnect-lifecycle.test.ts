import { describe, expect, test } from "bun:test";
import type { MailboxTokenSet, SalesRequestMailboxAdapter } from "./adapter";
import type { MailboxProvider } from "./contracts";
import { encryptMailboxSecret } from "./crypto";
import {
	type MailboxDisconnectClaim,
	type MailboxDisconnectStore,
	disconnectMailboxConnection,
} from "./disconnect-lifecycle";
import { MailboxProviderError } from "./errors";
import { GmailSalesRequestMailboxAdapter } from "./providers/gmail";
import { MicrosoftGraphMailboxAdapter } from "./providers/microsoft-graph";

const NOW = new Date("2026-09-13T14:00:00.000Z");
const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";
const DISCONNECT_ID = "22222222-2222-4222-8222-222222222222";
const KEY = Buffer.alloc(32, 7);

function encrypted(value: string, binding: string, keyVersion = "k1") {
	return encryptMailboxSecret({
		plaintext: value,
		key: KEY,
		keyVersion,
		binding,
	});
}

function claim(
	overrides: Partial<MailboxDisconnectClaim> = {},
): MailboxDisconnectClaim {
	return {
		disconnectId: DISCONNECT_ID,
		connectionId: CONNECTION_ID,
		previousConnectionRevision: 6,
		connectionRevision: 7,
		organizationId: 10,
		ownerUserId: 20,
		employeeProfileId: 30,
		officeAuthorityKey: "office:40",
		authorityRevision: "authority-7",
		provider: "gmail",
		providerAccountId: "provider-account-1",
		grantedScopes: [
			"https://www.googleapis.com/auth/gmail.readonly",
			"https://www.googleapis.com/auth/userinfo.email",
		],
		accessToken: encrypted("access-secret", `${CONNECTION_ID}:access-token`),
		refreshToken: encrypted("refresh-secret", `${CONNECTION_ID}:refresh-token`),
		tokenExpiresAt: new Date("2026-09-13T15:00:00.000Z"),
		...overrides,
	};
}

function store(overrides: Partial<MailboxDisconnectStore> = {}) {
	const calls = {
		claims: [] as unknown[],
		revoked: [] as unknown[],
		failures: [] as unknown[],
		completed: [] as unknown[],
	};
	const api: MailboxDisconnectStore = {
		async claimDisconnect(input) {
			calls.claims.push(input);
			return { kind: "provider-revocation-required", claim: claim() };
		},
		async recordProviderRevoked(input) {
			calls.revoked.push(input);
			return { kind: "cleanup-required" };
		},
		async recordDisconnectFailure(input) {
			calls.failures.push(input);
			return { kind: "recorded" };
		},
		async completeDisconnect(input) {
			calls.completed.push(input);
			return { kind: "completed" };
		},
		...overrides,
	};
	return { api, calls };
}

function adapter(provider: MailboxProvider = "gmail") {
	const calls = { revoked: [] as MailboxTokenSet[] };
	const api: SalesRequestMailboxAdapter = {
		provider,
		async revoke({ tokens }) {
			calls.revoked.push(tokens);
		},
		async createAuthorizationUrl() {
			throw new Error("not-used");
		},
		async exchangeAuthorizationCode() {
			throw new Error("not-used");
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

function input(actorUserId: number | null = 20) {
	return {
		actorUserId,
		connectionId: CONNECTION_ID,
		expectedConnectionRevision: 6,
		now: NOW,
	};
}

function cleanupClaim() {
	const value = claim();
	return {
		disconnectId: value.disconnectId,
		connectionId: value.connectionId,
		previousConnectionRevision: value.previousConnectionRevision,
		connectionRevision: value.connectionRevision,
		organizationId: value.organizationId,
		ownerUserId: value.ownerUserId,
		employeeProfileId: value.employeeProfileId,
		officeAuthorityKey: value.officeAuthorityKey,
		authorityRevision: value.authorityRevision,
	};
}

describe("mailbox disconnect lifecycle", () => {
	test("requires the current authenticated actor before touching storage", async () => {
		const persistence = store();
		const provider = adapter();
		expect(
			await disconnectMailboxConnection(input(null), {
				store: persistence.api,
				adapters: { gmail: provider.api },
				keyRing: { resolve: () => KEY },
			}),
		).toEqual({ kind: "rejected", reason: "missing-session" });
		expect(persistence.calls.claims).toHaveLength(0);
		expect(provider.calls.revoked).toHaveLength(0);
	});

	test("keeps wrong-owner and missing connections opaque", async () => {
		for (const actorUserId of [20, 99]) {
			const persistence = store({
				async claimDisconnect() {
					return { kind: "unavailable" };
				},
			});
			const provider = adapter();
			expect(
				await disconnectMailboxConnection(input(actorUserId), {
					store: persistence.api,
					adapters: { gmail: provider.api },
					keyRing: { resolve: () => KEY },
				}),
			).toEqual({ kind: "rejected", reason: "connection-unavailable" });
			expect(provider.calls.revoked).toHaveLength(0);
		}
		const persistence = store({
			async claimDisconnect() {
				return {
					kind: "provider-revocation-required",
					claim: claim({ ownerUserId: 99 }),
				};
			},
		});
		const provider = adapter();
		expect(
			await disconnectMailboxConnection(input(), {
				store: persistence.api,
				adapters: { gmail: provider.api },
				keyRing: { resolve: () => KEY },
			}),
		).toEqual({ kind: "rejected", reason: "connection-unavailable" });
		expect(provider.calls.revoked).toHaveLength(0);
		expect(persistence.calls.failures).toHaveLength(0);
	});

	test("claims with revision CAS and disables all reads even when mailbox policy is off", async () => {
		const persistence = store();
		const provider = adapter();
		expect(
			await disconnectMailboxConnection(input(), {
				store: persistence.api,
				adapters: { gmail: provider.api },
				keyRing: { resolve: () => KEY },
			}),
		).toEqual({ kind: "disconnected" });
		expect(persistence.calls.claims).toEqual([
			{
				actorUserId: 20,
				connectionId: CONNECTION_ID,
				expectedConnectionRevision: 6,
				now: NOW,
				authorityBehavior: {
					requireActiveEmployee: true,
					requireActiveProfile: true,
					requireCanonicalActiveOffice: true,
					requireOwnerMatch: true,
					ignoreMailboxPolicy: true,
				},
				claimBehavior: {
					deactivateConnection: true,
					incrementConnectionRevision: true,
					invalidateSyncLeases: true,
					invalidateCursors: true,
					invalidateSubscriptions: true,
					blockNewReads: true,
					persistResumableDisconnect: true,
				},
			},
		]);
	});

	test("decrypts exact purpose-bound envelopes only inside the provider call", async () => {
		const persistence = store();
		const provider = adapter();
		const result = await disconnectMailboxConnection(input(), {
			store: persistence.api,
			adapters: { gmail: provider.api },
			keyRing: {
				resolve(keyVersion) {
					expect(keyVersion).toBe("k1");
					return KEY;
				},
			},
		});
		expect(provider.calls.revoked).toEqual([
			{
				accessToken: "access-secret",
				refreshToken: "refresh-secret",
				expiresAt: new Date("2026-09-13T15:00:00.000Z"),
				grantedScopes: [
					"https://www.googleapis.com/auth/gmail.readonly",
					"https://www.googleapis.com/auth/userinfo.email",
				],
			},
		]);
		expect(result).toEqual({ kind: "disconnected" });
		const serializedServerPayloads = JSON.stringify({
			claim: persistence.calls.claims,
			revoked: persistence.calls.revoked,
			failures: persistence.calls.failures,
			completed: persistence.calls.completed,
			result,
		});
		expect(serializedServerPayloads).not.toContain("access-secret");
		expect(serializedServerPayloads).not.toContain("refresh-secret");
		expect(serializedServerPayloads).not.toContain("provider-account-1");
	});

	test("rejects a stale connection revision before provider work", async () => {
		const persistence = store({
			async claimDisconnect() {
				return { kind: "connection-changed" };
			},
		});
		const provider = adapter();
		expect(
			await disconnectMailboxConnection(input(), {
				store: persistence.api,
				adapters: { gmail: provider.api },
				keyRing: { resolve: () => KEY },
			}),
		).toEqual({ kind: "rejected", reason: "connection-changed" });
		expect(provider.calls.revoked).toHaveLength(0);
	});

	test("requires bounded opaque office and authority fences from the claimed store state", async () => {
		for (const candidate of [
			claim({ officeAuthorityKey: "" }),
			claim({ officeAuthorityKey: "x".repeat(256) }),
			claim({ authorityRevision: "" }),
		]) {
			const persistence = store({
				async claimDisconnect() {
					return { kind: "provider-revocation-required", claim: candidate };
				},
			});
			const provider = adapter();
			expect(
				await disconnectMailboxConnection(input(), {
					store: persistence.api,
					adapters: { gmail: provider.api },
					keyRing: { resolve: () => KEY },
				}),
			).toEqual({ kind: "retry-pending" });
			expect(provider.calls.revoked).toHaveLength(0);
		}
	});

	test("records tampered and unknown-key credentials without exposing decrypt errors", async () => {
		for (const candidate of [
			claim({
				accessToken: encrypted(
					"access-secret",
					`${CONNECTION_ID}:refresh-token`,
				),
			}),
			claim({
				accessToken: encrypted(
					"access-secret",
					`${CONNECTION_ID}:access-token`,
					"unknown-key",
				),
			}),
		]) {
			const persistence = store({
				async claimDisconnect() {
					return { kind: "provider-revocation-required", claim: candidate };
				},
			});
			const provider = adapter();
			const result = await disconnectMailboxConnection(input(), {
				store: persistence.api,
				adapters: { gmail: provider.api },
				keyRing: {
					resolve(keyVersion) {
						if (keyVersion !== "k1") throw new Error("unknown-key-secret");
						return KEY;
					},
				},
			});
			expect(result).toEqual({ kind: "retry-pending" });
			expect(provider.calls.revoked).toHaveLength(0);
			expect(persistence.calls.failures).toEqual([
				expect.objectContaining({
					phase: "provider-revocation",
					reason: "credentials-unavailable",
				}),
			]);
			expect(JSON.stringify(persistence.calls.failures)).not.toContain(
				"secret",
			);
		}
	});

	test("persists revoke failure and resumes the same disconnect on retry", async () => {
		let fail = true;
		let phase: "provider" | "cleanup" | "complete" = "provider";
		const persistence = store({
			async claimDisconnect() {
				if (phase === "complete") return { kind: "completed" };
				return phase === "provider"
					? { kind: "provider-revocation-required", claim: claim() }
					: {
							kind: "cleanup-required",
							claim: cleanupClaim(),
						};
			},
			async recordProviderRevoked(input) {
				persistence.calls.revoked.push(input);
				phase = "cleanup";
				return { kind: "cleanup-required" };
			},
			async completeDisconnect(input) {
				persistence.calls.completed.push(input);
				phase = "complete";
				return { kind: "completed" };
			},
		});
		const provider = adapter();
		provider.api.revoke = async ({ tokens }) => {
			provider.calls.revoked.push(tokens);
			if (fail) {
				fail = false;
				throw new MailboxProviderError({
					provider: "gmail",
					code: "provider-unavailable",
				});
			}
		};
		expect(
			await disconnectMailboxConnection(input(), {
				store: persistence.api,
				adapters: { gmail: provider.api },
				keyRing: { resolve: () => KEY },
			}),
		).toEqual({ kind: "retry-pending" });
		expect(persistence.calls.failures).toEqual([
			expect.objectContaining({
				phase: "provider-revocation",
				reason: "provider-revocation-failed",
			}),
		]);
		expect(
			await disconnectMailboxConnection(input(), {
				store: persistence.api,
				adapters: { gmail: provider.api },
				keyRing: { resolve: () => KEY },
			}),
		).toEqual({ kind: "disconnected" });
		expect(provider.calls.revoked).toHaveLength(2);
	});

	test("supports Graph local-only revocation through the existing adapter contract", async () => {
		const graphClaim = claim({ provider: "microsoft-graph" });
		const persistence = store({
			async claimDisconnect() {
				return { kind: "provider-revocation-required", claim: graphClaim };
			},
		});
		let providerFetches = 0;
		const graph = new MicrosoftGraphMailboxAdapter({
			clientId: "client-id",
			clientSecret: "client-secret",
			redirectUri: "https://app.example/oauth/callback",
			fetch: async () => {
				providerFetches += 1;
				throw new Error("provider-must-not-be-called");
			},
		});
		expect(
			await disconnectMailboxConnection(input(), {
				store: persistence.api,
				adapters: { "microsoft-graph": graph },
				keyRing: { resolve: () => KEY },
			}),
		).toEqual({ kind: "disconnected" });
		expect(providerFetches).toBe(0);
	});

	test("retries idempotent provider revocation when success could not be durably recorded", async () => {
		let transitionFails = true;
		let cleanupReady = false;
		let providerRevocations = 0;
		const persistence = store({
			async claimDisconnect() {
				return cleanupReady
					? {
							kind: "cleanup-required",
							claim: cleanupClaim(),
						}
					: { kind: "provider-revocation-required", claim: claim() };
			},
			async recordProviderRevoked(input) {
				persistence.calls.revoked.push(input);
				if (transitionFails) {
					transitionFails = false;
					throw new Error("database-transition-secret");
				}
				cleanupReady = true;
				return { kind: "cleanup-required" };
			},
		});
		const fetch = Object.assign(
			async (
				requestInput: string | URL | Request,
				init?: BunFetchRequestInit,
			) => {
				const request = new Request(requestInput, init);
				expect(request.url).toBe("https://oauth2.googleapis.com/revoke");
				expect(request.method).toBe("POST");
				expect(
					new URLSearchParams(await request.clone().text()).get("token"),
				).toBe("refresh-secret");
				providerRevocations += 1;
				return providerRevocations === 1
					? new Response(null, { status: 200 })
					: new Response(JSON.stringify({ error: "invalid_token" }), {
							status: 400,
							headers: { "content-type": "application/json" },
						});
			},
			{ preconnect: () => undefined },
		);
		const provider = new GmailSalesRequestMailboxAdapter({
			clientId: "gmail-client",
			clientSecret: "gmail-secret",
			redirectUri: "https://app.example/oauth/callback",
			fetch,
		});
		const dependencies = {
			store: persistence.api,
			adapters: { gmail: provider },
			keyRing: { resolve: () => KEY },
		};
		expect(await disconnectMailboxConnection(input(), dependencies)).toEqual({
			kind: "retry-pending",
		});
		expect(await disconnectMailboxConnection(input(), dependencies)).toEqual({
			kind: "disconnected",
		});
		expect(providerRevocations).toBe(2);
		expect(persistence.calls.revoked).toHaveLength(2);
		expect(persistence.calls.completed).toHaveLength(1);
		expect(JSON.stringify(persistence.calls.failures)).not.toContain("secret");
	});

	test("resumes cleanup without revoking again after a cleanup failure", async () => {
		let cleanupReady = false;
		let cleanupFails = true;
		const persistence = store({
			async claimDisconnect() {
				return cleanupReady
					? {
							kind: "cleanup-required",
							claim: cleanupClaim(),
						}
					: { kind: "provider-revocation-required", claim: claim() };
			},
			async recordProviderRevoked() {
				cleanupReady = true;
				return { kind: "cleanup-required" };
			},
			async completeDisconnect(input) {
				persistence.calls.completed.push(input);
				if (cleanupFails) {
					cleanupFails = false;
					throw new Error("private-cleanup-secret");
				}
				return { kind: "completed" };
			},
		});
		const provider = adapter();
		const dependencies = {
			store: persistence.api,
			adapters: { gmail: provider.api },
			keyRing: { resolve: () => KEY },
			clock: () => NOW,
		};
		expect(await disconnectMailboxConnection(input(), dependencies)).toEqual({
			kind: "retry-pending",
		});
		expect(await disconnectMailboxConnection(input(), dependencies)).toEqual({
			kind: "disconnected",
		});
		expect(provider.calls.revoked).toHaveLength(1);
		expect(persistence.calls.failures).toEqual([
			expect.objectContaining({
				phase: "cleanup",
				reason: "cleanup-failed",
			}),
		]);
		expect(JSON.stringify(persistence.calls.failures)).not.toContain("secret");
		expect(persistence.calls.completed.at(-1)).toEqual({
			disconnectId: DISCONNECT_ID,
			connectionId: CONNECTION_ID,
			previousConnectionRevision: 6,
			connectionRevision: 7,
			organizationId: 10,
			ownerUserId: 20,
			employeeProfileId: 30,
			officeAuthorityKey: "office:40",
			authorityRevision: "authority-7",
			now: NOW,
			cleanupBehavior: {
				eraseCredentials: true,
				erasePrivateSyncState: true,
				purgeRetainedSourceContent: "immediately",
				retainAudit: "content-free-only",
			},
		});
	});

	test("replays a completed disconnect idempotently with no sensitive result", async () => {
		const persistence = store({
			async claimDisconnect() {
				return { kind: "completed" };
			},
		});
		const provider = adapter();
		const result = await disconnectMailboxConnection(input(), {
			store: persistence.api,
			adapters: { gmail: provider.api },
			keyRing: { resolve: () => KEY },
		});
		expect(result).toEqual({ kind: "disconnected" });
		expect(Object.keys(result)).toEqual(["kind"]);
		expect(provider.calls.revoked).toHaveLength(0);
		expect(persistence.calls.completed).toHaveLength(0);
	});

	test("keeps cancelled Gmail revocation resumable with content-free evidence", async () => {
		const persistence = store();
		const provider = adapter();
		const cancellation = new AbortController();
		cancellation.abort(new Error("caller-secret"));

		expect(
			await disconnectMailboxConnection(
				{ ...input(), signal: cancellation.signal },
				{
					store: persistence.api,
					adapters: { gmail: provider.api },
					keyRing: { resolve: () => KEY },
				},
			),
		).toEqual({ kind: "retry-pending" });
		expect(provider.calls.revoked).toHaveLength(0);
		expect(persistence.calls.revoked).toHaveLength(0);
		expect(persistence.calls.completed).toHaveLength(0);
		expect(persistence.calls.failures).toEqual([
			expect.objectContaining({
				phase: "provider-revocation",
				reason: "provider-revocation-cancelled",
			}),
		]);
		expect(JSON.stringify(persistence.calls.failures)).not.toContain("secret");
	});

	test("records a bounded Gmail revoke deadline without completing cleanup", async () => {
		const persistence = store();
		const provider = adapter();
		provider.api.revoke = async () => {
			throw new MailboxProviderError({
				provider: "gmail",
				code: "network",
				requestFailure: "request-timeout",
			});
		};

		expect(
			await disconnectMailboxConnection(input(), {
				store: persistence.api,
				adapters: { gmail: provider.api },
				keyRing: { resolve: () => KEY },
			}),
		).toEqual({ kind: "retry-pending" });
		expect(persistence.calls.failures).toEqual([
			expect.objectContaining({
				phase: "provider-revocation",
				reason: "provider-revocation-deadline",
			}),
		]);
		expect(persistence.calls.revoked).toHaveLength(0);
		expect(persistence.calls.completed).toHaveLength(0);
	});

	test("keeps Graph local-only even when the caller signal is cancelled", async () => {
		const persistence = store({
			async claimDisconnect() {
				return {
					kind: "provider-revocation-required",
					claim: claim({ provider: "microsoft-graph" }),
				};
			},
		});
		const cancellation = new AbortController();
		cancellation.abort();
		let localRevocations = 0;
		const graph = adapter("microsoft-graph");
		graph.api.revoke = async () => {
			localRevocations += 1;
		};

		expect(
			await disconnectMailboxConnection(
				{ ...input(), signal: cancellation.signal },
				{
					store: persistence.api,
					adapters: { "microsoft-graph": graph.api },
					keyRing: { resolve: () => KEY },
				},
			),
		).toEqual({ kind: "disconnected" });
		expect(localRevocations).toBe(1);
		expect(persistence.calls.failures).toHaveLength(0);
	});

	test("reads fresh time immediately before every durable disconnect mutation", async () => {
		const persistence = store();
		const provider = adapter();
		const times = [0, 1, 2, 3].map(
			(offset) => new Date(NOW.getTime() + offset),
		);
		let clockRead = 0;

		expect(
			await disconnectMailboxConnection(
				{
					actorUserId: 20,
					connectionId: CONNECTION_ID,
					expectedConnectionRevision: 6,
				},
				{
					store: persistence.api,
					adapters: { gmail: provider.api },
					keyRing: { resolve: () => KEY },
					clock: () => times[Math.min(clockRead++, times.length - 1)] as Date,
				},
			),
		).toEqual({ kind: "disconnected" });
		expect(persistence.calls.claims[0]).toMatchObject({ now: times[0] });
		expect(persistence.calls.revoked[0]).toMatchObject({ now: times[2] });
		expect(persistence.calls.completed[0]).toMatchObject({ now: times[3] });
	});
});
