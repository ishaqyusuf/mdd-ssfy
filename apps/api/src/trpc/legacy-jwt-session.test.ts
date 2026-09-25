import { describe, expect, test } from "bun:test";
import { sign } from "jsonwebtoken";
import { resolveLegacyTrpcJwtUserId } from "./legacy-jwt-session";

const secret = "test-only-legacy-jwt-secret";

function token(claims: Record<string, unknown>) {
	return sign(claims, secret, { expiresIn: "1h" });
}

describe("legacy tRPC bearer session", () => {
	test("requires a live session and active company account on the main API", async () => {
		let query: Record<string, unknown> | undefined;
		const db = {
			session: {
				findFirst: async (input: { where: Record<string, unknown> }) => {
					query = input.where;
					return { userId: 42 };
				},
			},
		};
		expect(
			await resolveLegacyTrpcJwtUserId({
				token: token({ userId: 42, sessionId: "session-42" }),
				secret,
				db: db as never,
				allowCustomer: false,
			}),
		).toBe(42);
		expect(query).toMatchObject({
			id: "session-42",
			userId: 42,
			deletedAt: null,
			OR: [{ expires: null }, { expires: { gt: expect.any(Date) } }],
			user: {
				is: {
					accessRevokedAt: null,
					deletedAt: null,
					roles: {
						some: {
							deletedAt: null,
							role: { deletedAt: null },
							organization: { deletedAt: null },
						},
					},
				},
			},
		});
		expect(JSON.stringify(query)).not.toContain('"CUSTOMER"');
	});

	test("allows a live customer only on the dedicated storefront API", async () => {
		let query: Record<string, unknown> | undefined;
		const db = {
			session: {
				findFirst: async (input: { where: Record<string, unknown> }) => {
					query = input.where;
					return { userId: 42 };
				},
			},
		};
		expect(
			await resolveLegacyTrpcJwtUserId({
				token: token({ userId: 42, sessionId: "session-42" }),
				secret,
				db: db as never,
				allowCustomer: true,
			}),
		).toBe(42);
		expect(query).toMatchObject({
			user: {
				is: {
					OR: [
						expect.objectContaining({ roles: expect.any(Object) }),
						{
							type: "CUSTOMER",
							deletedAt: null,
							accessRevokedAt: null,
						},
					],
				},
			},
		});
	});

	test("denies a signed token after session or membership revocation", async () => {
		const db = { session: { findFirst: async () => null } };
		expect(
			await resolveLegacyTrpcJwtUserId({
				token: token({ userId: 42, sessionId: "revoked-session" }),
				secret,
				db: db as never,
				allowCustomer: false,
			}),
		).toBeUndefined();
	});

	test("rejects tampered, unbound, and wrong-purpose tokens before a database read", async () => {
		let reads = 0;
		const db = {
			session: {
				findFirst: async () => {
					reads += 1;
					return { userId: 42 };
				},
			},
		};
		for (const signedToken of [
			token({ userId: 42 }),
			token({ userId: 42, sessionId: "" }),
			token({ userId: -1, sessionId: "session-42" }),
			token({ userId: 1.5, sessionId: "session-42" }),
			sign({ userId: 42, sessionId: "session-42" }, "wrong-secret"),
		]) {
			expect(
				await resolveLegacyTrpcJwtUserId({
					token: signedToken,
					secret,
					db: db as never,
					allowCustomer: false,
				}),
			).toBeUndefined();
		}
		expect(reads).toBe(0);
	});
});
