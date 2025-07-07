"use server";

import { prisma } from "@/db";

export async function updateDykeStepMeta(id, meta) {
    await prisma.dykeSteps.update({
        where: { id },
        data: {
            meta,
            updatedAt: new Date(),
        },
    });
}
export async function updateDykeStepProductMeta(id, meta) {
    await prisma.dykeStepProducts.update({
        where: { id },
        data: {
            meta,
            updatedAt: new Date(0),
        },
    });
}
