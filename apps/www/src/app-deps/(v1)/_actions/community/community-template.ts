"use server";

import { prisma } from "@/db";

export async function staticCommunity() {
    return await prisma.communityModels.findMany({
        select: {
            id: true,
            modelName: true,
            projectId: true,
        },
    });
}
