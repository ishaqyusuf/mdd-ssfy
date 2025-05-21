"use server";

import { prisma } from "@/db";
import { revalidateTag } from "next/cache";
import { createSiteActionTicket } from "./create-site-action-ticket";

export async function updateEmployeeProfile(id, profileId) {
    const user = await prisma.users.update({
        where: {
            id,
        },
        data: {
            employeeProfile: {
                connect: {
                    id: profileId,
                },
            },
        },
        select: {
            name: true,
            employeeProfile: {
                select: {
                    name: true,
                },
            },
        },
    });
    createSiteActionTicket({
        event: "edited",
        type: "employee-profile",
        meta: {
            description: `${user.name} profile updated to ${user?.employeeProfile?.name}`,
        },
    });
    revalidateTag("employee-profiles");
    revalidateTag("employees");
    revalidateTag(`user_${id}`);
}
