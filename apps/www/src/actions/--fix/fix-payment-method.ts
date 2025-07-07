"use server";

import { prisma } from "@/db";

export async function fixPaymentMethod() {
    const customerPayments = await prisma.customerTransaction.findMany({
        where: {},
        select: {
            id: true,
            amount: true,
            paymentMethod: true,
            walletId: true,
        },
    });
    let update: any = {};
    let searchContent = { wid: null, pm: null };
    customerPayments.map((p) => {
        if (p.walletId && p.amount > 0) {
            searchContent.pm = p.paymentMethod;
            searchContent.wid = p.walletId;
            if (!update?.[p.paymentMethod]) update[p.paymentMethod as any] = [];
            return;
        }
        if (
            p.walletId == searchContent.wid &&
            p.amount < 0 &&
            !p.paymentMethod
        ) {
            update[searchContent.pm].push(p.id);
        }
    });
    // console.log(update);
    await Promise.all(
        Object.entries(update).map(async ([a, b]) => {
            if (a)
                await prisma.customerTransaction.updateMany({
                    where: {
                        id: { in: b as any },
                    },
                    data: {
                        paymentMethod: a,
                    },
                });
        })
    );
}
