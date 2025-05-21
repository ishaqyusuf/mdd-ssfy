"use server";

import { prisma } from "@/db";
import { revalidateTag } from "next/cache";
import { createSiteActionTicket } from "./create-site-action-ticket";

export async function updateEmployeeRole(id, roleId) {
    // await prisma.modelHasRoles.deleteMany({
    //     where: {
    //         user: {
    //             id,
    //         },
    //     },
    // });
    // const user = await prisma.users.update({
    //     where: {
    //         id,
    //     },
    //     data: {
    //         // customerTypeId: profileId,
    //         roles: {
    //             create: {
    //                 role: {
    //                     connect: {
    //                         id: roleId,
    //                     },
    //                 },
    //             },
    //         },
    //     },
    //     select: {
    //         name: true,
    //         roles: {
    //             select: {
    //                 role: {
    //                     select: {
    //                         name: true,
    //                     },
    //                 },
    //             },
    //         },
    //     },
    // });
    // createSiteActionTicket({
    //     event: "edited",
    //     type: "employee-role",
    //     meta: {
    //         description: `${user.name} role updated to ${user?.roles?.[0]?.role?.name}`,
    //         // description,
    //     },
    // });
    // revalidateTag("roles");
    // revalidateTag("employees");
    // revalidateTag(`user_${id}`);
}
