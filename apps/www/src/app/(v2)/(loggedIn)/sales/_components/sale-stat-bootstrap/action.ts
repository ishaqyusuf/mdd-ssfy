"use server";

import { prisma } from "@/db";

export async function loadSales() {
    const sales = await prisma.salesOrders.findMany({
        where: {
            type: "order",
        },
        select: {
            id: true,
            orderId: true,
            stat: {
                // select: {
                //     id: true,
                // },
            },
        },
    });
    return sales;
}
