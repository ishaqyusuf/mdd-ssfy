"use server";

import { prisma } from "@/db";
import { revalidateTag } from "next/cache";

export async function deleteRoleAction(id) {
    await prisma.roleHasPermissions.updateMany({
        where: {
            roleId: id,
        },
        data: {
            deletedAt: new Date(),
        },
    });
    await prisma.roles.update({
        where: {
            id,
        },
        data: {
            deletedAt: new Date(),
        },
    });
    revalidateTag("roles");
}
