import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";

export async function requireInventoryImportOperator(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication is required to manage inventory imports.",
		});
	}

	const actor = await ctx.db.users.findFirst({
		where: {
			id: ctx.userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: {
			id: true,
			name: true,
			roles: {
				where: { deletedAt: null },
				select: {
					role: {
						select: { name: true },
					},
				},
			},
		},
	});
	const isSuperAdmin = actor?.roles.some(
		(assignment) =>
			assignment.role?.name?.trim().toLowerCase() === "super admin",
	);
	if (!actor || !isSuperAdmin) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can manage inventory imports.",
		});
	}

	return actor;
}
