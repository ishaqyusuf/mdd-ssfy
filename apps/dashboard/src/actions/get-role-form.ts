"use server";

import { prisma } from "@/db";
import { revalidateTag } from "next/cache";
import { getPermissions } from "./cached-hrm";
import type { CreateRoleForm } from "./create-role-action";
import {
	getRolePermissionRows,
	getStaticRolePermissionNames,
} from "./role-permission-rows";

const staticPermissions = getStaticRolePermissionNames();
const legacyMarkFulfilledPermission = "mark sales order fulfilled";
const viewMarkFulfilledPermission = "view mark sales order fulfilled";

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
		revalidateTag("permissions", "max");
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
	const legacyMarkFulfilled = permissions.find(
		(permission) => permission.name === legacyMarkFulfilledPermission,
	);
	const viewMarkFulfilled = permissions.find(
		(permission) => permission.name === viewMarkFulfilledPermission,
	);
	const legacyGrant = role?.RoleHasPermissions.find(
		(permission) => permission.permissionId === legacyMarkFulfilled?.id,
	);
	if (legacyMarkFulfilled && viewMarkFulfilled && legacyGrant) {
		form.permissions[legacyMarkFulfilledPermission].checked = false;
		form.permissions[viewMarkFulfilledPermission] = {
			...form.permissions[viewMarkFulfilledPermission],
			permissionId: viewMarkFulfilled.id,
			roleId: legacyGrant.roleId,
			checked: true,
		};
	}
	const permissionsList = getRolePermissionRows(permissions);
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
	if (promise.length) revalidateTag("permissions", "max");
	return {
		permissionsList,
		form,
	};
}
