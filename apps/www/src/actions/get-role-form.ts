"use server";

import { prisma } from "@/db";
import { addSpacesToCamelCase } from "@/lib/utils";
import { PERMISSIONS } from "@gnd/utils/constants";
import { revalidateTag } from "next/cache";
import { getPermissions } from "./cached-hrm";
import type { CreateRoleForm } from "./create-role-action";

const staticPermissions = PERMISSIONS.map((permission) =>
	addSpacesToCamelCase(permission).toLocaleLowerCase(),
);

async function getUpdatedPermissions() {
	const permissions = await getPermissions();

	const newPermissions = staticPermissions.filter(
		(p) => !permissions?.find((a) => a.name === p),
	);
	if (newPermissions.length) {
		await prisma.permissions.createMany({
			data: newPermissions?.map((p) => ({
				name: p,
			})),
		});
		revalidateTag("permissions");
		return await getPermissions();
	}
	return permissions;
}
export async function getRoleForm(id?) {
	const role = id
		? await prisma.roles.findUnique({
				where: {
					id,
				},
				select: {
					id: true,
					name: true,
					RoleHasPermissions: {
						select: {
							permissionId: true,
							roleId: true,
						},
					},
				},
			})
		: null;
	const permissions = await getUpdatedPermissions();
	const form: CreateRoleForm = {
		id: role?.id,
		title: role?.name ?? "",
		permissions: {},
	};
	permissions?.map((p) => {
		const current = role?.RoleHasPermissions?.find(
			(r) => r.permissionId === p.id,
		);
		form.permissions[p.name] = {
			permissionId: p.id,
			roleId: current?.roleId,
			checked: !!current,
		};
	});
	const permissionsList = Array.from(
		new Set(
			permissions.map((permission) =>
				permission.name
					?.replace(/^edit /, "")
					.replace(/^view /, "")
					.replace(/^review /, "")
					?.toLocaleLowerCase(),
			) as string[],
		),
	).sort((a, b) => a.localeCompare(b));
	const promise = staticPermissions.map((name) => {
		if (!form.permissions[name]) {
			form.permissions[name] = {
				checked: false,
			};
		}
		if (!form.permissions[name]?.permissionId) {
			return (async () => {
				const s = await prisma.permissions.create({
					data: {
						name,
					},
				});
				form.permissions[name].permissionId = s.id;
			})();
		}
		return null;
	});
	await Promise.all(promise);
	if (promise.length) revalidateTag("permissions");
	return {
		permissionsList,
		form,
	};
}
