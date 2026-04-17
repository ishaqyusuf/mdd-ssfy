import type { TRPCContext } from "@api/trpc/init";
import {
	generatePermissions,
	isCommunityUnitRestrictedAccess,
} from "@gnd/utils/constants";
import { TRPCError } from "@trpc/server";

export async function getAuthCan(ctx: TRPCContext) {
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
							RoleHasPermissions: {
								where: {
									deletedAt: null,
								},
								select: {
									permission: {
										select: {
											name: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	const role = user?.roles?.[0]?.role;
	if (!role) return null;

	return generatePermissions(
		role.name,
		role.RoleHasPermissions.map((item) => item.permission),
	);
}

export async function isCommunityUnitRequest(ctx: TRPCContext) {
	return isCommunityUnitRestrictedAccess(await getAuthCan(ctx));
}

export async function assertInstallCostAccess(ctx: TRPCContext) {
	if (await isCommunityUnitRequest(ctx)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "CommunityUnit users cannot access install costs.",
		});
	}
}
