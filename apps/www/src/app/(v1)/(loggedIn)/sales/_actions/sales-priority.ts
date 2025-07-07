"use server";
import { prisma } from "@/db";
import { ISalesOrder, UpdateOrderPriorityProps } from "@/types/sales";

export async function updateOrderPriorityActon({
    priority,
    orderId,
}: UpdateOrderPriorityProps) {
    const { id, meta } = (
        await prisma.salesOrders.findMany({
            where: {
                orderId,
            },
        })
    )[0] as any as ISalesOrder;
    meta.priority = priority;
    await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            meta: meta as any,
        },
    });
}
