"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { whereUsers } from "@/utils/db/where.users";

export async function getUsersListAction(query: SearchParamsType) {
    const where = whereUsers(query);
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
            id: user.id?.toString(),
            name: user.name,
            role: user?.roles?.[0]?.role?.name,
        };
    });
}
