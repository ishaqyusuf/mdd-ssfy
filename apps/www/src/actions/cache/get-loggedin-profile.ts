"use server";

import {
    authId,
    authUser,
    serverSession,
    user,
} from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { ICan } from "@/types/auth";
import { cookies } from "next/headers";
import {
    getUserSpecificPermissions,
    mergePermissionRecords,
} from "@gnd/auth/utils";
import { generatePermissions } from "@gnd/utils/constants";

export async function getLoggedInProfile(debugMode = false) {
    let id = await authId();

    let roleId = await (async () => {
        try {
            const roleId = (await serverSession())?.role?.id;
            return roleId;
        } catch (error) {}
        return null;
    })();
    // if (env.NODE_ENV != "production" && debugMode) {
    //     const { userId, roleId: _roleId } = JSON.parse(
    //         (await cookies()).get("side-bar-auth-id")?.value || `{}`,
    //     );
    //     if (userId) id = userId;
    //     if (_roleId) roleId = _roleId;
    // }
    const tags = [`user_${id}`, `role_${roleId}`, "permissions"];

    const fn = async () => {
        let can: ICan = {} as any;
        const user = await prisma.users.findFirst({
            where: {
                id: id || -1,
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
        const rolePermissions = await prisma.permissions.findMany({
            where: {
                id: {
                    in: role?.RoleHasPermissions?.map((i) => i.permissionId) || [],
                },
            },
            select: {
                id: true,
                name: true,
            },
        });
        const specificPermissions = await getUserSpecificPermissions(
            prisma,
            user?.id,
        );
        can = generatePermissions(
            role?.name,
            mergePermissionRecords(rolePermissions, specificPermissions),
        );
        return {
            role: role?.name,
            roleId: role?.id,
            can,
            name: user?.name,
            userId: user?.id,
            email: user?.email,
        };
    };
    return await fn();
    // return (await unstable_cache(fn, tags, {
    //     tags,
    // })()) as AsyncFnType<typeof fn>;
}
export async function setSidebarAuthId(userId, e) {
    (await cookies()).set(
        "side-bar-auth-id",
        JSON.stringify({
            userId,
            roleId: e.role?.id,
        })
    );
}
