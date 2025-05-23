"use server";

import { prisma } from "@/db";
import { getPermissions } from "./cached-hrm";
import { CreateRoleForm } from "./create-role-action";
import { revalidatePath, revalidateTag } from "next/cache";

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
        title: role?.name ?? "",
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
    const promise = permissionsList.map((p) => {
        return ["view", "edit"]
            .map((a) => {
                const name = `${a} ${p}`;
                if (!form.permissions[name])
                    form.permissions[name] = {
                        checked: false,
                    };
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
            })
            .filter(Boolean);
    });
    await Promise.all(promise);
    if (promise.length) revalidateTag("permissions");
    return {
        permissionsList,
        form,
    };
}
