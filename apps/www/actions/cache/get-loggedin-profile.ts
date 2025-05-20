"use server";

import { authId, authUser, serverSession } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { env } from "@/env.mjs";
import { adminPermissions } from "@/lib/data/role";
import { camel } from "@/lib/utils";
import { ICan } from "@/types/auth";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

export async function getLoggedInProfile() {
    let id = await authId();
    let roleId = (await serverSession())?.role?.id;
    if (env.NODE_ENV != "production") {
        const { userId, roleId: _roleId } = JSON.parse(
            cookies().get("side-bar-auth-id")?.value || `{}`,
        );
        if (userId) id = userId;
        if (_roleId) roleId = _roleId;
    }
    return unstable_cache(
        async () => {
            let can: ICan = {} as any;
            const user = await prisma.users.findFirst({
                where: {
                    id,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    roles: {
                        where: {
                            deletedAt: null,
                        },
                        take: 1,
                        select: {
                            role: {
                                select: {
                                    id: true,
                                    name: true,
                                    RoleHasPermissions: {
                                        where: {
                                            deletedAt: null,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            const role = user?.roles?.[0]?.role;
            const permissionIds =
                role?.RoleHasPermissions?.map((i) => i.permissionId) || [];
            const permissions = await prisma.permissions.findMany({
                where: {
                    id: {
                        // in: permissionIds,
                    },
                },
                select: {
                    id: true,
                    name: true,
                },
            });
            if (role.name == "Admin") {
                can = adminPermissions;
            } else
                permissions.map((p) => {
                    can[camel(p.name) as any] =
                        permissionIds.includes(p.id) || role?.name == "Admin";
                });
            return {
                role: role?.name,
                roleId: role?.id,
                can,
                name: user?.name,
                userId: user?.id,
                email: user.email,
            };
        },
        [`user_${id}`, `role_${roleId}`, "permissions"],
        {
            tags: [`user_${id}`, `role_${roleId}`, "permissions"],
        },
    )();
}
export async function setSidebarAuthId(userId, e) {
    cookies().set(
        "side-bar-auth-id",
        JSON.stringify({
            userId,
            roleId: e.role?.id,
        }),
    );
}
