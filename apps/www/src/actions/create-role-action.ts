"use server";

import z from "zod";
import { createRoleSchema } from "./schema.hrm";
import { actionClient } from "./safe-action";
import { prisma } from "@/db";
import { revalidateTag } from "next/cache";

export type CreateRoleForm = z.infer<typeof createRoleSchema>;

export async function createRole(data: CreateRoleForm) {
    const permissions = Object.values(data.permissions).filter(
        (permission) => typeof permission.permissionId === "number",
    );

    if (data.id) {
        await prisma.roles.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.title,
            },
        });
    } else {
        data.id = (
            await prisma.roles.create({
                data: {
                    name: data.title,
                },
            })
        ).id;
    }
    await prisma.roleHasPermissions.deleteMany({
        where: {
            roleId: data.id,
            permissionId: {
                in: permissions
                    .map((p) => (!p.checked ? p.permissionId : null))
                    .filter(Boolean),
            },
        },
    });
    const permissionsToCreate = permissions
        .filter((p) => p.checked && !p.roleId)
        .map((d) => ({
            permissionId: d.permissionId!,
            roleId: data.id,
        }));

    if (permissionsToCreate.length) {
        await prisma.roleHasPermissions.createMany({
            data: permissionsToCreate,
        });
    }
    revalidateTag(`roles`);
    revalidateTag(`role_${data.id}`);
    revalidateTag(`employees_filter_data`);
}
export const createRoleAction = actionClient
    .schema(createRoleSchema)
    .action(async ({ parsedInput: data }) => {
        // return await transaction(async (tx) => {
        const resp = await createRole(data);
        return resp;
        // });
    });
