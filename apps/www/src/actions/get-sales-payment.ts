"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { AsyncFnType } from "@/types";
import { ISalesPaymentMeta } from "@/types/sales";
import { whereSalesPayment } from "@/utils/db/where.sales-payment";

export type GetSalesPayments = AsyncFnType<typeof getSalesPaymentsAction>;
export async function getSalesPaymentsAction(query: SearchParamsType) {
    const where = whereSalesPayment(query);

    const payments = await prisma.salesPayments.findMany({
        where,
        orderBy: {
            createdAt: "desc",
        },
        select: {
            id: true,
            order: {
                select: {
                    id: true,
                    orderId: true,
                },
            },
            note: true,
            meta: true,
            status: true,
            amount: true,
            createdAt: true,
            transaction: {
                include: { author: {} },
                // select: {
                //     id: true,
                //     paymentMethod: true,
                //     status: true,
                //     author: {
                //         select: {
                //             name: true,
                //             id: true,
                //         },
                //     },
                // },
            },
        },
    });
    const transactions = payments.map((payment) => {
        let meta: ISalesPaymentMeta = payment.meta as any;
        return {
            salesId: payment.order?.id,
            salesNo: payment.order?.orderId,
            payment,
            id: payment.id,
            paymentId: `P${payment.id}-T${payment.transaction.id}`,
            receivedBy: payment.transaction.author?.name,
            amount: payment.amount,
            note:
                payment.note ||
                `$${formatMoney(payment.amount)} paid for order ${
                    payment.order?.orderId
                }`,
            date: payment.createdAt,
            status: payment.status,
            paymentMethod:
                payment.transaction.paymentMethod ||
                meta?.paymentOption ||
                meta?.payment_option,
        };
    });
    return {
        status: "success",
        transactions,
    };
}
