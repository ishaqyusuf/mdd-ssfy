import { describe, expect, test } from "bun:test";

import {
	getActiveWebLegacyUserWhere,
	recordWebMasterPasswordLoginAudit,
	resolveWebLegacyCredentialSignIn,
} from "./better-auth/www";
import { toMobileAuthSession } from "./better-auth/www-session";

describe("www Better Auth legacy user lookup", () => {
	test("limits master-capable login to active internal users", () => {
		expect(getActiveWebLegacyUserWhere(" Admin@Example.com ")).toEqual({
			email: "Admin@Example.com",
			accessRevokedAt: null,
			deletedAt: null,
			OR: [{ type: null }, { type: { in: ["EMPLOYEE", "MANAGER"] } }],
		});
	});
});

describe("www master password login audit", () => {
	test("writes LOGIN usage through the shared writer", async () => {
		const calls: unknown[] = [];

		await recordWebMasterPasswordLoginAudit(
			{
				accountEmail: "rep@example.com",
				accountName: "Sales Rep",
				countryCode: "US",
				ipAddress: "203.0.113.10",
				platform: "WEBSITE",
				sessionId: "session-id",
				userAgent: "Browser UA",
				userId: 42,
			},
			{
				writeUsage: async (_db, input) => {
					calls.push(input);
					return { id: "audit-id" };
				},
			},
		);

		const recorded = calls[0] as Record<string, unknown>;
		expect(calls.length).toBe(1);
		expect(recorded.usageType).toBe("LOGIN");
		expect(recorded.targetUserId).toBe(42);
		expect(recorded.sessionId).toBe("session-id");
		expect(recorded.requestId).toBe(null);
		expect(recorded.resourceType).toBe(null);
		expect(recorded.resourceId).toBe(null);
	});

	test("keeps login auditing best-effort when persistence fails", async () => {
		const failure = new Error("audit unavailable");
		const errors: unknown[] = [];

		await expect(
			recordWebMasterPasswordLoginAudit(
				{
					accountEmail: "rep@example.com",
					accountName: "Sales Rep",
					countryCode: null,
					ipAddress: null,
					platform: "WEBSITE",
					sessionId: "session-id",
					userAgent: null,
					userId: 42,
				},
				{
					onError: (error) => errors.push(error),
					writeUsage: async () => {
						throw failure;
					},
				},
			),
		).resolves.toBeUndefined();
		expect(errors).toEqual([failure]);
	});
});

describe("www Better Auth credential decision", () => {
	test("authenticates master password without migration or password writes", async () => {
		const calls: string[] = [];

		const result = await resolveWebLegacyCredentialSignIn({
			authUserId: "auth-user-id",
			clearLegacyPassword: async () => {
				calls.push("clear-legacy-password");
			},
			compareLegacyPassword: async () => {
				calls.push("compare-legacy-password");
				return false;
			},
			createPasswordMigrationToken: async () => {
				calls.push("create-migration-token");
				return "migration-token";
			},
			credentialAccount: null,
			ensureCredentialAccount: async () => {
				calls.push("ensure-credential-account");
			},
			legacyPasswordHash: "legacy-hash",
			legacyUserId: 42,
			masterPasswordMatches: (password) => password === "master-pass",
			password: "master-pass",
			tokenAuthenticated: false,
			verifyCredentialPassword: async () => {
				calls.push("verify-credential-password");
				return false;
			},
		});

		expect(result).toEqual({
			authenticated: true,
			masterPasswordAuthenticated: true,
		});
		expect(calls).toEqual(["ensure-credential-account"]);
	});

	test("keeps an existing auth password untouched during master login", async () => {
		const calls: string[] = [];

		const result = await resolveWebLegacyCredentialSignIn({
			authUserId: "auth-user-id",
			clearLegacyPassword: async () => {
				calls.push("clear-legacy-password");
			},
			createPasswordMigrationToken: async () => {
				calls.push("create-migration-token");
				return "migration-token";
			},
			credentialAccount: { password: "existing-auth-password-hash" },
			ensureCredentialAccount: async () => {
				calls.push("ensure-credential-account");
			},
			legacyPasswordHash: "legacy-hash",
			legacyUserId: 42,
			masterPasswordMatches: (password) => password === "master-pass",
			password: "master-pass",
			tokenAuthenticated: false,
			verifyCredentialPassword: async () => {
				calls.push("verify-credential-password");
				return false;
			},
		});

		expect(result.authenticated).toBe(true);
		expect(result.masterPasswordAuthenticated).toBe(true);
		expect(calls).toEqual(["ensure-credential-account"]);
	});

	test("still requires password migration for a normal legacy password without auth password", async () => {
		const calls: string[] = [];

		const result = await resolveWebLegacyCredentialSignIn({
			authUserId: "auth-user-id",
			callbackURL: "/sales-book/orders",
			clearLegacyPassword: async () => {
				calls.push("clear-legacy-password");
			},
			compareLegacyPassword: async () => {
				calls.push("compare-legacy-password");
				return true;
			},
			createPasswordMigrationToken: async () => {
				calls.push("create-migration-token");
				return "migration-token";
			},
			credentialAccount: null,
			ensureCredentialAccount: async () => {
				calls.push("ensure-credential-account");
			},
			legacyPasswordHash: "legacy-hash",
			legacyUserId: 42,
			masterPasswordMatches: () => false,
			password: "user-password",
			tokenAuthenticated: false,
			verifyCredentialPassword: async () => {
				calls.push("verify-credential-password");
				return false;
			},
		});

		expect(result).toEqual({
			authenticated: false,
			masterPasswordAuthenticated: false,
			requiresPasswordMigration: true,
			url: "/login/create-password?token=migration-token&callbackUrl=%2Fsales-book%2Forders",
		});
		expect(calls).toEqual([
			"compare-legacy-password",
			"ensure-credential-account",
			"create-migration-token",
		]);
	});

	test("clears old legacy password only after normal auth password exists", async () => {
		const calls: string[] = [];

		const result = await resolveWebLegacyCredentialSignIn({
			authUserId: "auth-user-id",
			clearLegacyPassword: async () => {
				calls.push("clear-legacy-password");
			},
			compareLegacyPassword: async () => {
				calls.push("compare-legacy-password");
				return true;
			},
			createPasswordMigrationToken: async () => {
				calls.push("create-migration-token");
				return "migration-token";
			},
			credentialAccount: { password: "existing-auth-password-hash" },
			ensureCredentialAccount: async () => {
				calls.push("ensure-credential-account");
			},
			legacyPasswordHash: "legacy-hash",
			legacyUserId: 42,
			masterPasswordMatches: () => false,
			password: "user-password",
			tokenAuthenticated: false,
			verifyCredentialPassword: async () => {
				calls.push("verify-credential-password");
				return false;
			},
		});

		expect(result).toEqual({
			authenticated: true,
			masterPasswordAuthenticated: false,
		});
		expect(calls).toEqual(["compare-legacy-password", "clear-legacy-password"]);
	});

	test("rejects an unconfigured master password with generic unauthenticated result", async () => {
		const result = await resolveWebLegacyCredentialSignIn({
			authUserId: "auth-user-id",
			clearLegacyPassword: async () => undefined,
			compareLegacyPassword: async () => false,
			createPasswordMigrationToken: async () => "migration-token",
			credentialAccount: null,
			ensureCredentialAccount: async () => undefined,
			legacyPasswordHash: null,
			legacyUserId: 42,
			masterPasswordMatches: () => false,
			password: "not-master-pass",
			tokenAuthenticated: false,
			verifyCredentialPassword: async () => false,
		});

		expect(result).toEqual({
			authenticated: false,
			masterPasswordAuthenticated: false,
		});
	});
});

describe("www Better Auth mobile session payload", () => {
	test("includes the Better Auth token and active session id", () => {
		const result = toMobileAuthSession("session-token", {
			activeSession: {
				expires: new Date("2026-01-01T00:00:00.000Z"),
				id: "session-id",
				ipAddress: null,
				userAgent: "Expo",
			},
			can: {} as never,
			rememberMe: true,
			role: null,
			user: {
				id: 42,
				email: "admin@example.com",
				name: "Admin",
			} as never,
		});

		expect(result?.sessionId).toBe("session-id");
		expect(result?.token).toBe("session-token");
		expect(result?.user.id).toBe(42);
	});

	test("rejects payloads without an active session id", () => {
		expect(
			toMobileAuthSession("session-token", {
				activeSession: null,
				can: {} as never,
				role: null,
				user: {
					id: 42,
				} as never,
			}),
		).toBe(null);
	});
});
