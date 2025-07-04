"use server";

import { prisma } from "@/db"; 

export async function saveDykeMeta(id, meta: any) {
    const resp = await prisma.dykeSteps.update({
        where: { id },
        data: {
            meta: meta as any,
            updatedAt: new Date(),
        },
    });
    return resp;
}
