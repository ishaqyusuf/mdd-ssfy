import { describe, expect, test } from "bun:test";
import {
	type SalesRequestPermissionAuthorityDatabase,
	resolveSalesRequestPermissionAuthority,
} from "./sales-request-permission-authority";

const updatedAt = new Date("2026-09-13T00:00:00.000Z");

function permission(id: number, name: string) {
	return { id, name, updatedAt, deletedAt: null };
}

function role(input: {
	id: number;
	name: string;
	permissions?: Array<{ id: number; name: string }>;
	organizationId?: number;
}) {
	return {
		roleId: input.id,
		organizationId: input.organizationId ?? 1,
		deletedAt: null,
		role: {
			id: input.id,
			name: input.name,
			updatedAt,
			deletedAt: null,
			RoleHasPermissions: (input.permissions ?? []).map((entry) => ({
				permissionId: entry.id,
				deletedAt: null,
				permission: permission(entry.id, entry.name),
			})),
		},
	};
}

function user(roles: ReturnType<typeof role>[]) {
	return {
		id: 42,
		updatedAt,
		deletedAt: null,
		accessRevokedAt: null,
		roles,
	};
}

function directGrant(id: number, name: string, modelType = "users") {
	return {
		permissionId: id,
		modelType,
		modelId: 42n,
		deletedAt: null,
		permissions: permission(id, name),
	};
}

function database(input?: {
	users?: ReturnType<typeof user>[];
	direct?: ReturnType<typeof directGrant>[];
}) {
	const calls: { users: unknown[]; direct: unknown[] } = {
		users: [],
		direct: [],
	};
	const db: SalesRequestPermissionAuthorityDatabase = {
		users: {
			findMany: async (args) => {
				calls.users.push(args);
				return input?.users ?? [user([])];
			},
		},
		modelHasPermissions: {
			findMany: async (args) => {
				calls.direct.push(args);
				return input?.direct ?? [];
			},
		},
	};
	return { db, calls };
}

describe("resolveSalesRequestPermissionAuthority", () => {
	test("accepts Super Admin for both native order and quote creation", async () => {
		for (const surface of ["order", "quote"] as const) {
			const { db } = database({
				users: [user([role({ id: 1, name: "Super Admin" })])],
			});
			const result = await resolveSalesRequestPermissionAuthority({
				db,
				actorUserId: 42,
				surface,
			});
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.authority.grant).toBe("super-admin");
				expect(result.authority.surface).toBe(surface);
				expect(result.authority.revision).toMatch(/^pa1:[a-f0-9]{64}$/);
			}
		}
	});

	test("accepts editOrders from an active role", async () => {
		const { db } = database({
			users: [
				user([
					role({
						id: 2,
						name: "Sales",
						permissions: [{ id: 7, name: "editOrders" }],
					}),
				]),
			],
		});
		const result = await resolveSalesRequestPermissionAuthority({
			db,
			actorUserId: 42,
			surface: "order",
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.authority.grant).toBe("editOrders");
	});

	test("accepts editOrders direct grants for every native model-type alias", async () => {
		for (const modelType of ["users", "user", "App\\Models\\User"]) {
			const { db } = database({
				direct: [directGrant(7, "editOrders", modelType)],
			});
			const result = await resolveSalesRequestPermissionAuthority({
				db,
				actorUserId: 42,
				surface: "quote",
			});
			expect(result.ok).toBe(true);
			if (result.ok) expect(result.authority.grant).toBe("editOrders");
		}
	});

	test("denies editEstimates-only actors because native creation requires editOrders", async () => {
		const { db } = database({
			direct: [directGrant(8, "editEstimates")],
		});
		const result = await resolveSalesRequestPermissionAuthority({
			db,
			actorUserId: 42,
			surface: "quote",
		});
		expect(result).toEqual({
			ok: false,
			issues: [{ code: "permission-denied" }],
			authority: null,
		});
	});

	test("rejects invalid input before reading authority tables", async () => {
		const { db, calls } = database();
		const result = await resolveSalesRequestPermissionAuthority({
			db,
			actorUserId: 0,
			surface: "order",
		});
		expect(result.ok).toBe(false);
		expect(calls).toEqual({ users: [], direct: [] });
	});

	test("distinguishes missing, ambiguous, and stale actors", async () => {
		const missing = database({ users: [] });
		expect(
			await resolveSalesRequestPermissionAuthority({
				db: missing.db,
				actorUserId: 42,
				surface: "order",
			}),
		).toEqual({
			ok: false,
			issues: [{ code: "actor-not-found" }],
			authority: null,
		});

		const ambiguous = database({ users: [user([]), user([])] });
		expect(
			await resolveSalesRequestPermissionAuthority({
				db: ambiguous.db,
				actorUserId: 42,
				surface: "order",
			}),
		).toEqual({
			ok: false,
			issues: [{ code: "actor-ambiguous" }],
			authority: null,
		});

		const staleUser = { ...user([]), accessRevokedAt: updatedAt };
		const stale = database({ users: [staleUser] });
		expect(
			await resolveSalesRequestPermissionAuthority({
				db: stale.db,
				actorUserId: 42,
				surface: "order",
			}),
		).toEqual({
			ok: false,
			issues: [{ code: "actor-stale" }],
			authority: null,
		});
	});

	test("fails closed on malformed role and direct permission evidence", async () => {
		const malformedRole = role({
			id: 2,
			name: "Sales",
			permissions: [{ id: 7, name: "editOrders" }],
		});
		const malformedRoleGrant = malformedRole.role.RoleHasPermissions[0];
		if (!malformedRoleGrant) throw new Error("Expected role grant fixture.");
		malformedRoleGrant.permissionId = 99;
		const roleResult = await resolveSalesRequestPermissionAuthority({
			db: database({ users: [user([malformedRole])] }).db,
			actorUserId: 42,
			surface: "order",
		});
		expect(roleResult).toEqual({
			ok: false,
			issues: [{ code: "permission-evidence-stale" }],
			authority: null,
		});

		const malformedDirect = directGrant(7, "editOrders");
		malformedDirect.modelId = 99n;
		const directResult = await resolveSalesRequestPermissionAuthority({
			db: database({ direct: [malformedDirect] }).db,
			actorUserId: 42,
			surface: "order",
		});
		expect(directResult).toEqual({
			ok: false,
			issues: [{ code: "permission-evidence-stale" }],
			authority: null,
		});
	});

	test("uses privacy-minimized active evidence queries", async () => {
		const { db, calls } = database({
			direct: [directGrant(7, "editOrders")],
		});
		await resolveSalesRequestPermissionAuthority({
			db,
			actorUserId: 42,
			surface: "order",
		});
		const serialized = JSON.stringify(calls, (_key, value) =>
			typeof value === "bigint" ? value.toString() : value,
		);
		expect(serialized).not.toContain("email");
		expect(serialized).not.toContain("phone");
		expect(serialized).not.toContain("password");
		expect(serialized).toContain('"deletedAt":null');
		expect(serialized).toContain('"accessRevokedAt":null');
		expect(serialized).toContain('"take":2');
	});

	test("revision is order-independent but binds surface and current evidence", async () => {
		const roles = [
			role({
				id: 2,
				name: "Sales",
				permissions: [{ id: 7, name: "editOrders" }],
			}),
			role({ id: 3, name: "Estimator" }),
		];
		const first = await resolveSalesRequestPermissionAuthority({
			db: database({
				users: [user(roles)],
				direct: [directGrant(9, "viewOrders")],
			}).db,
			actorUserId: 42,
			surface: "order",
		});
		const reordered = await resolveSalesRequestPermissionAuthority({
			db: database({
				users: [user([...roles].reverse())],
				direct: [directGrant(9, "viewOrders")],
			}).db,
			actorUserId: 42,
			surface: "order",
		});
		const quote = await resolveSalesRequestPermissionAuthority({
			db: database({ users: [user(roles)] }).db,
			actorUserId: 42,
			surface: "quote",
		});
		expect(first.ok && reordered.ok && first.authority.revision).toBe(
			reordered.ok && reordered.authority.revision,
		);
		expect(first.ok && quote.ok && first.authority.revision).not.toBe(
			quote.ok && quote.authority.revision,
		);
	});
});
