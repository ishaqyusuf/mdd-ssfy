"use server";

import { SalesPaymentStatus } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { sum } from "@/lib/utils";

export async function updateSalesDueAmount(salesId, _tx?) {
    let tx: typeof prisma = _tx || prisma;
    const order = await tx.salesOrders.findUniqueOrThrow({
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
                    deletedAt: null,
                },
                select: {
                    amount: true,
                    transaction: {
                        where: {
                            deletedAt: null,
                        },
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
        await tx.salesOrders.update({
            where: { id: order.id },
            data: {
                amountDue,
            },
        });
}
