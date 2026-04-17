import type { TRPCContext } from "@api/trpc/init";
import { isCommunityUnitRole } from "@gnd/utils/constants";
import { TRPCError } from "@trpc/server";

export async function getAuthRoleName(ctx: TRPCContext) {
	if (!ctx.userId) return null;

	const user = await ctx.db.users.findFirst({
		where: {
			id: ctx.userId,
		},
		select: {
			roles: {
				where: {
					deletedAt: null,
				},
				take: 1,
				select: {
					role: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});

	return user?.roles?.[0]?.role?.name ?? null;
}

export async function isCommunityUnitRequest(ctx: TRPCContext) {
	return isCommunityUnitRole(await getAuthRoleName(ctx));
}

export async function assertInstallCostAccess(ctx: TRPCContext) {
	if (await isCommunityUnitRequest(ctx)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "CommunityUnit users cannot access install costs.",
		});
	}
}
