"use server";

import { prisma } from "@/db";

export async function checkSalesItems() {
    const i = await prisma.salesOrderItems.count({
        where: {},
    });
    const c = await prisma.salesOrderItems.create({
        data: {
            meta: { lineIndex: 0 },
            total: 0,
            rate: 0,
            qty: 1,
            price: 0,
            tax: 0,
            id: 48239,
            salesOrderId: 1430,
        },
    });
    return {
        count: i,
        c,
        _: await prisma.dykeStepForm.findMany({
            where: {
                id: {
                    in: [305, 306],
                },
            },
        }),
    };
}
