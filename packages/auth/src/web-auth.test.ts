import { describe, expect, test } from "bun:test";

import {
	getActiveWebLegacyUserWhere,
	resolveWebLegacyCredentialSignIn,
} from "./better-auth/www";

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
