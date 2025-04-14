"use server";

import { prisma } from "@/db";

export async function resetSalesStatAction(salesId) {
    await prisma.qtyControl.deleteMany({
        where: {
            itemControl: {
                salesId,
            },
        },
    });
    await prisma.salesStat.deleteMany({
        where: {
            salesId,
        },
    });
}
