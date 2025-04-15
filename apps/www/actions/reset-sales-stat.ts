"use server";

import { prisma } from "@/db";

export async function resetSalesStatAction(salesId) {
    return;
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
    // fetch sales data

    // update assignment to include salesitemcontroluid
}
