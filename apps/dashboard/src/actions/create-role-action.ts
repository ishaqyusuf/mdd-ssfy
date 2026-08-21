"use server";

import { prisma } from "@/db";
import { revalidateTag } from "next/cache";
import type z from "zod";
import { actionClient } from "./safe-action";
import { createRoleSchema } from "./schema.hrm";

export type CreateRoleForm = z.infer<typeof createRoleSchema>;

async function createRole(data: CreateRoleForm) {
	const permissionIds = Object.values(data.permissions).flatMap((permission) =>
		permission.checked && typeof permission.permissionId === "number"
			? [permission.permissionId]
			: [],
	);
	const uniquePermissionIds = [...new Set(permissionIds)];

	const role = await prisma.$transaction(async (tx) => {
		const existingRole = data.id
			? await tx.roles.findUnique({
					where: { id: data.id },
					select: {
						id: true,
						RoleHasPermissions: {
							select: { permissionId: true },
						},
					},
				})
			: null;
		if (data.id && !existingRole) {
			throw new Error("Role not found");
		}

		const role = existingRole
			? await tx.roles.update({
					where: { id: existingRole.id },
					data: { name: data.title },
				})
			: await tx.roles.create({
					data: { name: data.title },
				});
		const existingPermissionIds = new Set(
			existingRole?.RoleHasPermissions.map(
				(permission) => permission.permissionId,
			) ?? [],
		);
		const permissionsToRemove = [...existingPermissionIds].filter(
			(permissionId) => !uniquePermissionIds.includes(permissionId),
		);
		const permissionsToAdd = uniquePermissionIds.filter(
			(permissionId) => !existingPermissionIds.has(permissionId),
		);

		if (permissionsToRemove.length) {
			await tx.roleHasPermissions.deleteMany({
				where: {
					roleId: role.id,
					permissionId: { in: permissionsToRemove },
				},
			});
		}
		if (permissionsToAdd.length) {
			await tx.roleHasPermissions.createMany({
				data: permissionsToAdd.map((permissionId) => ({
					permissionId,
					roleId: role.id,
				})),
				skipDuplicates: true,
			});
		}

		if (
			existingRole &&
			(permissionsToRemove.length || permissionsToAdd.length)
		) {
			const usersWithRole = await tx.modelHasRoles.findMany({
				where: { roleId: role.id },
				select: { modelId: true },
			});
			const userIds = [...new Set(usersWithRole.map((user) => user.modelId))];

			if (userIds.length) {
				await Promise.all([
					tx.session.deleteMany({
						where: { userId: { in: userIds } },
					}),
					tx.webAuthSession.deleteMany({
						where: {
							user: { legacyUserId: { in: userIds } },
						},
					}),
				]);
			}
		}

		return role;
	});

	revalidateTag("roles");
	revalidateTag(`role_${role.id}`);
	revalidateTag("employees_filter_data");
}
export const createRoleAction = actionClient
	.schema(createRoleSchema)
	.action(async ({ parsedInput: data }) => {
		// return await transaction(async (tx) => {
		const resp = await createRole(data);
		return resp;
		// });
	});
