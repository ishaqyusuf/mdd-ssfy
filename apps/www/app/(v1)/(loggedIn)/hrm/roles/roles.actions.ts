"use server";

import { prisma } from "@/db";
import { transformData } from "@/lib/utils";
import { ServerPromiseType } from "@/types";

// export type GetRoleFormAction = ServerPromiseType<typeof getRoleFormAction>;
export interface GetRoleFormAction {
    permission: { [permission in string]: boolean };
    roleId;
    name;
}
export async function getRoleFormAction(roleId = null) {
    const resp: GetRoleFormAction = {
        roleId,
        name: "",
        permission: {},
    };
    if (roleId) {
        const role = await prisma.roles.findFirst({
            where: { id: roleId },
            include: {
                RoleHasPermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        // const rhp = await prisma.roleHasPermissions.findMany({
        //     where: {
        //         roleId,
        //     },
        //     include: {
        //         permission: true,
        //     },
        // });
        role.RoleHasPermissions.map(
            (r) => (resp.permission[r.permission.name] = true),
        );
        resp.name = role.name;
        // return {
        //     roleId,
        //     permission,
        // };
    }
    return resp;
    // return {
    //     roleId: null,
    //     permission,
    //     name: "",
    // };
}
export async function saveRoleAction(role: GetRoleFormAction) {
    // const permissionList = permissions;
    const pl = await prisma.permissions.findMany({
        select: { name: true, id: true },
    });
    console.log(pl);
    const ids: number[] = [];
    console.log(role.permission);
    await Promise.all(
        Object.entries(role.permission).map(async ([k, v]) => {
            if (!v) return;

            const e = pl.find((p) => p.name == k);
            if (e && v == true) {
                ids.push(e.id);
            } else {
                const newPermission = await prisma.permissions.create({
                    data: {
                        name: k,
                        ...transformData({}),
                    },
                });
                ids.push(newPermission.id);
            }
        }),
    );
    if (!role.roleId)
        role.roleId = (
            await prisma.roles.create({
                data: {
                    name: role.name,
                    ...transformData({}),
                    RoleHasPermissions: {
                        createMany: {
                            data: [
                                ...ids.map((permissionId) => ({
                                    permissionId,
                                })),
                            ],
                            skipDuplicates: true,
                        },
                    },
                },
            })
        ).id;
    else
        await prisma.roles.update({
            where: {
                id: role.roleId,
            },
            data: {
                name: role.name,
                ...transformData({}, true),
                RoleHasPermissions: {
                    createMany: {
                        data: [
                            ...ids.map((permissionId) => ({ permissionId })),
                        ],
                        skipDuplicates: true,
                    },
                },
            },
        });
    await prisma.roleHasPermissions.deleteMany({
        where: {
            roleId: role.roleId,
            permissionId: {
                notIn: ids,
            },
        },
    });
}
export async function deleteRoleAction(id) {
    await prisma.roles.update({
        where: { id },
        data: {
            deletedAt: new Date(),
        },
    });
    await prisma.modelHasRoles.deleteMany({
        where: {
            roleId: id,
        },
    });
}
