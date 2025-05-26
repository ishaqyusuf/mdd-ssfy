"use server";

import { prisma } from "@/db";
import { getPermissions } from "./cached-hrm";
import { CreateRoleForm } from "./create-role-action";
import { revalidateTag } from "next/cache";
import { PERMISSIONS } from "@/data/contants/permissions";
import { addSpacesToCamelCase } from "@/lib/utils";

async function getUpdatedPermissions() {
    const staticPermissions = PERMISSIONS.map((p) =>
        addSpacesToCamelCase(p)?.toLocaleLowerCase(),
    );
    const permissions = await getPermissions();

    const stalePermissions = permissions.filter(
        (a) => !staticPermissions?.includes(a.name),
    );
    const newPermissions = staticPermissions.filter(
        (p) => !permissions?.find((a) => a.name == p),
    );
    if (newPermissions.length) {
        await prisma.permissions.createMany({
            data: newPermissions?.map((p) => ({
                name: p,
            })),
        });
        revalidateTag("permissions");
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
