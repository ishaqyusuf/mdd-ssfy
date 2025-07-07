"use server";

import { prisma } from "@/db";

export async function _updateBuilderMetaAction(meta, id) {
    const builder = await prisma.builders.update({
        where: { id },
        data: {
            updatedAt: new Date(),
            meta,
        },
    });
    return builder;
}
