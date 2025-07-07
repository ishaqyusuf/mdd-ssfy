"use server";

import { prisma } from "@/db";
import { revalidateTag } from "next/cache";

export async function deleteProfileAction(id) {
    await prisma.employeeProfile.updateMany({
        where: {
            id: id,
        },
        data: {
            deletedAt: new Date(),
        },
    });
    revalidateTag("employee-profiles");
}
