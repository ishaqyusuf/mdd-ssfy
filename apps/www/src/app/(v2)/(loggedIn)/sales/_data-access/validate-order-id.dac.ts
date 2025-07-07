"use server";

import { prisma } from "@/db";

export async function _validateOrderId(orderId, id) {
    console.log([orderId]);
    const e = await prisma.salesOrders.findFirst({
        where: {
            orderId: {
                equals: orderId,
            },
        },
    });
    if (e) {
        const [y, m] = e.orderId.split("-");
        const nOrderId = [y, m, e.id].join("-");
        await prisma.salesOrders.update({
            where: {
                id: e.id,
            },
            data: {
                orderId: nOrderId,
                slug: nOrderId,
            },
        });
        console.log(["orderId edited", nOrderId, orderId]);
    }
}
