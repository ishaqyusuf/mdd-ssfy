import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { Prisma } from "@/db";
import { addSpacesToCamelCase } from "@/lib/utils";
import { Permission } from "@/types/auth";
import { some } from "lodash";

import { composeQuery } from "../../app/(clean-code)/(sales)/_common/utils/db-utils";

export function mergePermissionsQuery(...permissions: Permission[]) {
    return permissions.join(",") as any;
}
export function whereUsers(query: SearchParamsType) {
    const wheres: Prisma.UsersWhereInput[] = [];

    const permissions = query["user.permissions"]?.split(",");
    const cannot = query["user.cannot"]?.split(",");

    if (permissions?.length) {
        const wherePermissions: Prisma.PermissionsWhereInput[] = [];
        permissions.map((permission) => {
            const name = addSpacesToCamelCase(permission).toLocaleLowerCase();
            wherePermissions.push({
                name,
            });
        });
        wheres.push({
            roles: {
                some: {
                    role:
                        wherePermissions?.length > 1
                            ? {
                                  AND: wherePermissions.map((permission) => ({
                                      RoleHasPermissions: {
                                          some: {
                                              permission,
                                          },
                                      },
                                  })),
                              }
                            : {
                                  RoleHasPermissions: {
                                      some: {
                                          permission: wherePermissions[0],
                                      },
                                  },
                              },
                },
            },
        });
    }
    if (cannot?.length)
        wheres.push({
            roles: {
                some: {
                    role: {
                        RoleHasPermissions: {
                            every: {
                                AND: cannot?.map((p) => ({
                                    permission: {
                                        name: {
                                            not: addSpacesToCamelCase(
                                                p,
                                            ).toLocaleLowerCase(),
                                        },
                                    },
                                })),
                            },
                        },
                    },
                },
            },
        });
    let role = query["user.role"];
    if (role)
        wheres.push({
            roles: {
                some: {
                    role: {
                        name: role,
                    },
                },
            },
        });
    return composeQuery(wheres);
}
