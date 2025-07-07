"use server";

import { whereUsers } from "@/utils/db/where.users";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { AsyncFnType } from "@/types";
import { Permission } from "@/types/auth";

export type GetUsersList = AsyncFnType<typeof getUsersListAction>;
export async function getUsersListAction(props: SearchParamsType) {
    const where = whereUsers(props);
    const users = await prisma.users.findMany({
        where,
        select: {
            id: true,
            name: true,
            roles: {
                select: {
                    roleId: true,
                    role: {
                        select: {
                            RoleHasPermissions: {
                                select: {
                                    permission: {},
                                },
                            },
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });
    return users.map((user) => {
        return {
            id: user.id,
            name: user.name,
            role: user?.roles?.[0]?.role?.name,
        };
    });
}
function mergePermissions(...permissions: Permission[]) {
    return permissions.join(",") as any;
}
export async function getDispatchUsersListAction() {
    return await getUsersListAction({
        "user.permissions": mergePermissions("viewDelivery", "viewPickup"),
    });
}
