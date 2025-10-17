"use server";

import { prisma } from "@/db";

export async function getEmailTemplates(type) {
    return prisma.mailGrids.findMany({
        where: {
            type,
        },
        select: {
            id: true,
            html: true,
            title: true,
            subject: true,
            type: true,
        },
    });
}
