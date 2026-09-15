import { describe, expect, it } from "bun:test";

import { getLegacyUserByAuthUserId } from "./www-session";

describe("web/mobile session role liveness", () => {
	it("loads only active assignments, roles, organizations, and grants", async () => {
		let userQuery: Record<string, unknown> | undefined;
		const sourceDb = {
			webAuthUser: {
				findUnique: async () => ({ legacyUserId: 42 }),
			},
			users: {
				findFirst: async (query: Record<string, unknown>) => {
					userQuery = query;
					return { id: 42, roles: [{ role: { name: "Employee" } }] };
				},
			},
		};

		const user = await getLegacyUserByAuthUserId("web-user-42", sourceDb as never);

		expect(user?.roles).toEqual([{ role: { name: "Employee" } }]);
		expect(userQuery).toEqual({
			where: { id: 42, accessRevokedAt: null, deletedAt: null },
			include: {
				roles: {
					where: {
						deletedAt: null,
						role: { deletedAt: null },
						organization: { deletedAt: null },
					},
					include: {
						role: {
							include: {
								RoleHasPermissions: { where: { deletedAt: null } },
							},
						},
					},
				},
			},
		});
	});

	it("does not resolve a legacy user after auth mapping is gone", async () => {
		let userRead = false;
		const sourceDb = {
			webAuthUser: { findUnique: async () => null },
			users: {
				findFirst: async () => {
					userRead = true;
					return null;
				},
			},
		};
		expect(await getLegacyUserByAuthUserId("missing", sourceDb as never)).toBe(null);
		expect(userRead).toBe(false);
	});
});
