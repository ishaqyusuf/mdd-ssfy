"use server";

import { prisma } from "@/db";
import { getPermissions } from "./cached-hrm";
import { CreateRoleForm } from "./create-role-action";

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
                      },
                  },
              },
          })
        : null;
    const permissions = await getPermissions();
    const form: CreateRoleForm = {
        id: role?.id,
        title: role?.name,
        permissions: {},
    };
    permissions?.map((p) => {
        form.permissions[p.name] = {
            permissionId: p.id,
            checked: role?.RoleHasPermissions?.some(
                (r) => r.permissionId == p.id,
            ),
        };
    });
    const permissionsList = Array.from(
        new Set(
            permissions.map((a) =>
                a?.name?.replace("edit ", "").replace("view ", ""),
            ) as string[],
        ),
    ).sort((a, b) => a.localeCompare(b));
    return {
        permissionsList,
        form,
    };
}
