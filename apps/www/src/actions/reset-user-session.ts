"use server";

import { prisma } from "@/db";

export async function resetUserSessionAction(userId) {
    await prisma.session.deleteMany({
        where: {
            userId,
        },
    });
    await prisma.webAuthSession.deleteMany({
        where: {
            user: {
                legacyUserId: userId,
            },
        },
    });
}
