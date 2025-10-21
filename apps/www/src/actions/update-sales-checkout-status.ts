"use server";

import { SquarePaymentStatus } from "@/_v2/lib/square";
import { prisma } from "@/db";
import { amountFromCent, squareClient } from "@/utils/square-utils";

interface Props {
    squareOrderId: string;
    checkoutId: string;
}
export async function updateSalesCheckoutStatus({
    squareOrderId,
    checkoutId,
}: Props) {
    const { order } = await squareClient.orders.get({
        orderId: squareOrderId,
    });
    const createdAt = new Date();
    const tenders = await Promise.all(
        order.tenders.map(async (tender) => {
            const {
                // result: { payment },
                payment,
            } = await squareClient.payments.get({
                paymentId: tender.paymentId,
            });
            const tipCent = payment?.tipMoney?.amount;
            const status = payment.status as SquarePaymentStatus;
            const tenderId = payment.id;
            const amountCent = payment.amountMoney.amount;
            const tip = tipCent
                ? amountFromCent(parseInt(tipCent as any))
                : null;
            const amount = amountFromCent(parseInt(amountCent as any));
            return await prisma.checkoutTenders.upsert({
                where: {
                    tenderId,
                    // salesCheckoutId: checkoutId,
                },
                create: {
                    tenderId,
                    status,
                    tip,
                    amount,
                    // salesCheckoutId: checkoutId,
                    checkout: {
                        connect: {
                            id: checkoutId,
                        },
                    },
                    createdAt,
                },
                update: {
                    status,
                    tip,
                    amount,
                },
            });
        })
    );
    return {
        tenders,
        newTenders: tenders.filter(
            (tender) =>
                tender.status === ("COMPLETED" as SquarePaymentStatus) &&
                tender.createdAt === createdAt
        ).length,
    };
}
