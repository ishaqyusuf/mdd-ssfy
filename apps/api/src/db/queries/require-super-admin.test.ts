import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";

import { requireSuperAdmin } from "./hrm";

type GuardUser = {
	id: number;
	name: string | null;
	roles: { role: { name: string } }[];
};

function mockContext(user: GuardUser | null, capture: (query: unknown) => void) {
	return {
		userId: 42,
		db: {
			users: {
				findFirst: async (query: unknown) => {
					capture(query);
					return user;
				},
			},
		} as unknown as TRPCContext["db"],
	} satisfies TRPCContext;
}

describe("current Super Admin authority", () => {
	it("queries only active users and active referenced roles", async () => {
		let query: unknown;
		const actor = await requireSuperAdmin(
			mockContext(
				{ id: 42, name: "Admin", roles: [{ role: { name: "Super Admin" } }] },
				(value) => {
					query = value;
				},
			),
		);
		expect(actor).toEqual({ id: 42, name: "Admin" });
		expect(query).toMatchObject({
			where: { id: 42, deletedAt: null, accessRevokedAt: null },
			select: {
				roles: { where: { deletedAt: null, role: { deletedAt: null } } },
			},
		});
	});

	it("accepts any active Super Admin assignment, not only the first", async () => {
		const actor = await requireSuperAdmin(
			mockContext(
				{
					id: 42,
					name: null,
					roles: [
						{ role: { name: "Employee" } },
						{ role: { name: "Super Admin" } },
					],
				},
				() => {},
			),
		);
		expect(actor).toEqual({ id: 42, name: "Super Admin" });
	});

	it("denies unavailable users and users without an active Super Admin role", async () => {
		await expect(requireSuperAdmin(mockContext(null, () => {}))).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(
			requireSuperAdmin(
				mockContext(
					{ id: 42, name: "Employee", roles: [{ role: { name: "Employee" } }] },
					() => {},
				),
			),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
