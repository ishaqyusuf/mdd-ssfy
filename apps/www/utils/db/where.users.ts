import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { Prisma } from "@/db";
import { addSpacesToCamelCase } from "@/lib/utils";

import { composeQuery } from "../../app/(clean-code)/(sales)/_common/utils/db-utils";

export function whereUsers(query: SearchParamsType) {
    const wheres: Prisma.UsersWhereInput[] = [];

    const permissions = query["user.permissions"]?.split(",");

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
