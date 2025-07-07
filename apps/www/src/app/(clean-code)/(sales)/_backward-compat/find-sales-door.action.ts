"use server";

import { prisma } from "@/db";

export async function findSalesDoorAction() {
    const d = await prisma.dykeSalesDoors.findMany({
        where: {
            // OR: [
            //     {
            housePackageToolId: 4024,
            deletedAt: {},
            //     },
            // ],
        },
    });
    return d;
}
