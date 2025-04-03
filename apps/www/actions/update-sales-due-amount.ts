"use server";

import { SalesPaymentStatus } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { sum } from "@/lib/utils";

export async function updateSalesDueAmount(salesId) {
    const order = await prisma.salesOrders.findUniqueOrThrow({
        where: {
            id: salesId,
        },
        select: {
            amountDue: true,
            grandTotal: true,
            id: true,
            payments: {
                where: {
                    status: "success" as SalesPaymentStatus,
                },
                select: {
                    amount: true,
                    transaction: {
                        select: {
                            amount: true,
                            type: true,
                        },
                    },
                },
            },
        },
    });
    const totalPaid = formatMoney(sum(order.payments, "amount"));
    const amountDue = formatMoney(order.grandTotal - totalPaid);
    if (amountDue !== order.amountDue)
        await prisma.salesOrders.update({
            where: { id: order.id },
            data: {
                amountDue,
            },
        });
}
