import { describe, expect, it } from "bun:test";
import { requireDealerProgramSuperAdmin } from "./dealer-program.route";

function contextFor(
	roleName: string | null,
	options?: { accessRevoked?: boolean; roleDeleted?: boolean },
) {
	return {
		userId: 21,
		db: {
			users: {
				findFirst: async (query: {
					where: { accessRevokedAt?: null };
					select: { roles: { where: { role?: { deletedAt?: null } } } };
				}) => {
					if (options?.accessRevoked && query.where.accessRevokedAt === null) {
						return null;
					}
					const roleActive =
						!options?.roleDeleted ||
						query.select.roles.where.role?.deletedAt !== null;
					return {
						roles: roleName && roleActive ? [{ role: { name: roleName } }] : [],
					};
				},
			},
		},
	};
}

describe("dealer customer invitation authorization", () => {
	it("allows a Super Admin to manage dealership invitations", async () => {
		await expect(
			requireDealerProgramSuperAdmin(contextFor("Super Admin") as never),
		).resolves.toBe(21);
	});

	it("rejects Sales Team and other office users", async () => {
		await expect(
			requireDealerProgramSuperAdmin(contextFor("Sales Team") as never),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("rejects revoked employees and deleted Super Admin roles", async () => {
		await expect(
			requireDealerProgramSuperAdmin(
				contextFor("Super Admin", { accessRevoked: true }) as never,
			),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			requireDealerProgramSuperAdmin(
				contextFor("Super Admin", { roleDeleted: true }) as never,
			),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
