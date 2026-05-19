import { describe, expect, test } from "bun:test";
import { hash } from "bcrypt-ts";

import {
	checkPassword,
	isMasterPassword,
	loginAction,
	parseMasterPasswords,
} from "./utils";

describe("master password helpers", () => {
	test("parses a single value", () => {
		expect(parseMasterPasswords("single-pass")).toEqual(["single-pass"]);
	});

	test("parses comma, semicolon, and newline separated values", () => {
		expect(parseMasterPasswords("one, two;three\nfour")).toEqual([
			"one",
			"two",
			"three",
			"four",
		]);
	});

	test("trims whitespace and drops empty entries", () => {
		expect(parseMasterPasswords(" one, ,\n two ; ")).toEqual(["one", "two"]);
	});

	test("matches exactly and case-sensitively", () => {
		process.env.NEXT_BACK_DOOR_TOK = "Alpha,beta";

		expect(isMasterPassword("Alpha")).toBe(true);
		expect(isMasterPassword("alpha")).toBe(false);
		expect(isMasterPassword(" beta ")).toBe(false);
	});
});

describe("checkPassword", () => {
	test("accepts a valid hashed password", async () => {
		const hashed = await hash("user-pass", 10);

		await expect(checkPassword(hashed, "user-pass")).resolves.toBeUndefined();
	});

	test("rejects an invalid password when master passwords are disabled", async () => {
		process.env.NEXT_BACK_DOOR_TOK = "master-pass";
		const hashed = await hash("user-pass", 10);

		await expect(checkPassword(hashed, "master-pass", false)).rejects.toThrow(
			"Wrong credentials. Try Again",
		);
	});

	test("accepts a configured master password when enabled", async () => {
		process.env.NEXT_BACK_DOOR_TOK = "primary,master-pass";
		const hashed = await hash("user-pass", 10);

		await expect(
			checkPassword(hashed, "master-pass", true),
		).resolves.toBeUndefined();
	});

	test("rejects an unconfigured password when master passwords are enabled", async () => {
		process.env.NEXT_BACK_DOOR_TOK = "primary,master-pass";
		const hashed = await hash("user-pass", 10);

		await expect(checkPassword(hashed, "wrong-pass", true)).rejects.toThrow(
			"Wrong credentials. Try Again",
		);
	});
});

describe("loginAction token auth", () => {
	test("does not require the master password env for a valid token", async () => {
		process.env.NEXT_BACK_DOOR_TOK = undefined;
		const db = {
			emailTokenLogin: {
				findFirst: async () => ({
					createdAt: new Date(),
					id: "token-id",
					userId: 42,
				}),
			},
			users: {
				findUnique: async () => ({
					email: "admin@example.com",
					id: 42,
				}),
				findFirst: async () => ({
					accessRevokedAt: null,
					email: "admin@example.com",
					id: 42,
					password: "not-used-for-token-auth",
					roles: [],
				}),
			},
			permissions: {
				findMany: async () => [],
			},
			modelHasPermissions: {
				findMany: async () => [],
			},
			session: {
				create: async () => ({
					expires: new Date(),
					id: "session-id",
					ipAddress: null,
					userAgent: null,
				}),
			},
		};

		const result = await loginAction(db as unknown as Parameters<typeof loginAction>[0], {
			token: "token-id",
		});

		expect(result?.sessionId).toBe("session-id");
		expect(result?.user.email).toBe("admin@example.com");
	});
});
