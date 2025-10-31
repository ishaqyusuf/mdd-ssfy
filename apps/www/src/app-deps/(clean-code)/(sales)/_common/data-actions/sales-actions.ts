"use server";

import { prisma } from "@/db";

export async function deleteSalesByOrderIds(orderIds) {
    await prisma.salesOrders.updateMany({
        where: {
            orderId: {
                in: orderIds,
            },
        },
        data: {
            deletedAt: new Date(),
        },
    });
}
