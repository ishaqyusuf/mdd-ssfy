"use server";

import { prisma } from "@/db";

export async function _getEmailTemplates(type) {
    return await prisma.mailGrids.findMany({
        where: {
            type,
        },
    });
}
