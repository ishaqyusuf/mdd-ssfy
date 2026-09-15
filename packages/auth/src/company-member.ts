import type { Prisma } from "@gnd/db";

export const activeCompanyRoleAssignmentWhere = {
	deletedAt: null,
	role: { deletedAt: null },
	organization: { deletedAt: null },
} satisfies Prisma.ModelHasRolesWhereInput;

/** Company access is tied to a live role in a live organization, not a user row alone. */
export function getActiveCompanyMemberWhere(
	identity: { id?: number; email?: string } = {},
): Prisma.UsersWhereInput {
	return {
		...identity,
		deletedAt: null,
		accessRevokedAt: null,
		OR: [{ type: null }, { type: { in: ["EMPLOYEE", "MANAGER"] } }],
		roles: { some: activeCompanyRoleAssignmentWhere },
	};
}
