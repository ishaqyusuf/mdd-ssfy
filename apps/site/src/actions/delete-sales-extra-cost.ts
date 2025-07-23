"use server";

import { prisma } from "@/db";

export async function deleteSalesExtraCost(id) {
    await prisma.salesExtraCosts.delete({
        where: {
            id,
        },
    });
}
