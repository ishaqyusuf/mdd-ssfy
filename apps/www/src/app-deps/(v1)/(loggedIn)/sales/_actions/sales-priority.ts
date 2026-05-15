"use server";

import { prisma } from "@/db";
import { ISalesOrder, UpdateOrderPriorityProps } from "@/types/sales";

export async function updateOrderPriorityActon({
    priority,
    orderId,
}: UpdateOrderPriorityProps) {
    const { id } = (
        await prisma.salesOrders.findMany({
            where: {
                orderId,
            },
        })
    )[0] as any as ISalesOrder;
    await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            priority,
        },
    });
}
