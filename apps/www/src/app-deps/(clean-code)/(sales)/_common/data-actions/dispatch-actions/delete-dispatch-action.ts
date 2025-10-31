"use server";

import { prisma } from "@/db";
import { resetSalesStatAction } from "../sales-stat-control.action";

export async function deleteDispatchAction(id) {
    return await prisma.$transaction((async (tx: typeof prisma) => {
        const resp = await prisma.orderDelivery.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                items: {
                    updateMany: {
                        where: {},
                        data: {
                            deletedAt: new Date(),
                        },
                    },
                },
            },
        });
        const salesId = resp.salesOrderId;
        // await resetSalesStatAction(salesId);
    }) as any);
}
export async function restoreDispatchAction(id) {
    return await prisma.$transaction((async (tx: typeof prisma) => {
        const resp = await prisma.orderDelivery.update({
            where: { id, deletedAt: {} },
            data: {
                deletedAt: null,
            },
        });
        const salesId = resp.salesOrderId;
        // await resetSalesStatAction(salesId);
    }) as any);
}
