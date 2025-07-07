"use server";

import { prisma } from "@/db";

export async function resetUserSessionAction(userId) {
    await prisma.session.deleteMany({
        where: {
            userId,
        },
    });
}
