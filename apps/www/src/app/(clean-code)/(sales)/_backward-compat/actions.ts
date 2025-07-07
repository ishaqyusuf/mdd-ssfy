"use server";

import { prisma } from "@/db";
import { isMonth, isYear } from "../../_common/utils/db-utils";
import dayjs from "dayjs";
import { sum } from "@/lib/utils";

export async function getJanuarySalesAction() {
    const r = await prisma.salesPayments.findMany({
        where: {
            order: {
                type: {
                    not: "order",
                },
            },
        },
    });
    return {
        r,
    };
    // const payments = await prisma.salesPayments.findMany({
    //     where: {
    //         deletedAt: null,
    //         order: {
    //             deletedAt: null,
    //         },
    //     },
    //     select: {
    //         amount: true,
    //         id: true,
    //         order: {
    //             select: {
    //                 grandTotal: true,
    //                 orderId: true,
    //                 amountDue: true,
    //             },
    //         },
    //     },
    // });
    const orders = await prisma.salesOrders.findMany({
        where: {
            deletedAt: null,
            payments: {
                some: {
                    deletedAt: null,
                    AND: [
                        {
                            createdAt: isMonth(dayjs().subtract(1, "month")),
                        },
                        {
                            createdAt: isYear(dayjs()),
                        },
                    ],
                },
            },
        },
        select: {
            payments: {
                where: {
                    deletedAt: null,
                    AND: [
                        {
                            createdAt: isMonth(dayjs().subtract(1, "month")),
                        },
                        {
                            createdAt: isYear(dayjs()),
                        },
                    ],
                },
                select: {
                    amount: true,
                    createdAt: true,
                    transactionId: true,

                    checkout: {
                        select: {
                            userId: true,
                        },
                    },
                    transaction: {
                        select: {
                            refundTx: true,
                            authorId: true,
                        },
                    },
                },
            },
            id: true,
            orderId: true,
            amountDue: true,
            grandTotal: true,
        },
    });
    let totalVal = 0;
    orders.map((a) =>
        a.payments.map((s) => (totalVal = sum([totalVal, s.amount])))
    );
    return {
        totalVal,
        orders,
    };
}
