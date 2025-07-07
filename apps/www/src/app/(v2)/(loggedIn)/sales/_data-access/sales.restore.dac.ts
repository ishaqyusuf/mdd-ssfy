"use server";

import { prisma } from "@/db";

export async function restoreSalesDac(id) {
    const s = await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            deletedAt: null,
        },
    });
    // console.log(s);
}
