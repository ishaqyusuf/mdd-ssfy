import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";

export async function requireSalesRequestSettingsAdmin(ctx: TRPCContext) {
	if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	const actor = await ctx.db.users.findFirst({
		where: { id: ctx.userId, deletedAt: null, accessRevokedAt: null },
		select: {
			roles: {
				where: { deletedAt: null, role: { deletedAt: null } },
				select: { role: { select: { name: true, deletedAt: true } } },
			},
		},
	});
	if (
		!actor?.roles.some(
			(assignment) =>
				assignment.role?.deletedAt == null &&
				assignment.role?.name?.trim().toLowerCase() === "super admin",
		)
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can configure sales request settings.",
		});
	}
}
