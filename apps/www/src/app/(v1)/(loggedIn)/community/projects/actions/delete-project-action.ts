"use server";

import { prisma } from "@/db";

export async function deleteProjectAction(id) {
    await prisma.projects.update({
        where: { id },
        data: {
            deletedAt: new Date(),
        },
    });
}
