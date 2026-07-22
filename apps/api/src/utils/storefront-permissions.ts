import { getUserSpecificPermissions } from "@gnd/auth/utils";
import type { Database } from "@gnd/db";
import { TRPCError } from "@trpc/server";

export const storefrontPermissionNames = [
	"viewStorefront",
	"editStorefront",
	"publishStorefront",
	"viewStorefrontCarts",
	"editStorefrontCarts",
	"viewStorefrontOrders",
	"editStorefrontOrders",
] as const;

export type StorefrontPermission = (typeof storefrontPermissionNames)[number];

export async function getStorefrontEmployeePermissions(
	db: Database,
	userId: number,
) {
	const user = await db.users.findFirst({
		where: {
			id: userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: {
			roles: {
				where: { deletedAt: null },
				select: {
					role: {
						select: {
							name: true,
							RoleHasPermissions: {
								select: {
									permission: {
										select: { name: true },
									},
								},
							},
						},
					},
				},
			},
		},
	});
	if (!user) return new Set<StorefrontPermission>();
	const isSuperAdmin = user.roles.some(
		(entry) => entry.role?.name?.trim().toLowerCase() === "super admin",
	);
	if (isSuperAdmin) return new Set(storefrontPermissionNames);

	const specific = await getUserSpecificPermissions(db, userId);
	const grantedNames = [
		...user.roles.flatMap(
			(entry) =>
				entry.role?.RoleHasPermissions.map(
					(permission) => permission.permission.name,
				) ?? [],
		),
		...specific.map((permission) => permission.name),
	];
	return new Set(
		grantedNames.filter((name): name is StorefrontPermission =>
			storefrontPermissionNames.includes(name as StorefrontPermission),
		),
	);
}

export async function requireStorefrontEmployeePermission(input: {
	db: Database;
	userId?: number;
	permission: StorefrontPermission;
}) {
	if (!input.userId) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	const permissions = await getStorefrontEmployeePermissions(
		input.db,
		input.userId,
	);
	if (!permissions.has(input.permission)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Missing ${input.permission} permission.`,
		});
	}
	return permissions;
}

export async function requireStorefrontQuoteCreationPermission(input: {
	db: Database;
	userId?: number;
}) {
	if (!input.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	const user = await input.db.users.findFirst({
		where: {
			id: input.userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: {
			roles: {
				where: { deletedAt: null },
				select: {
					role: {
						select: {
							name: true,
							RoleHasPermissions: {
								where: { deletedAt: null },
								select: {
									permission: { select: { name: true } },
								},
							},
						},
					},
				},
			},
		},
	});
	if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
	const isSuperAdmin = user.roles.some(
		(entry) => entry.role?.name?.trim().toLowerCase() === "super admin",
	);
	const specific = await getUserSpecificPermissions(input.db, input.userId);
	const canEditOrders = [
		...specific.map((permission) => permission.name),
		...user.roles.flatMap(
			(entry) =>
				entry.role?.RoleHasPermissions.map(
					(item) => item.permission.name,
				) || [],
		),
	].includes("editOrders");
	if (!isSuperAdmin && !canEditOrders) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Creating a sales quote requires editOrders permission.",
		});
	}
}
