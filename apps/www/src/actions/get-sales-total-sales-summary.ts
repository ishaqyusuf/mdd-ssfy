import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";

export const getSalesTotalSalesSummary = async (query: SearchParamsType) => {
    const salesRepId = query["salesRep.id"];
    const fromDate = query["date.from"]
        ? new Date(query["date.from"])
        : undefined;
    const toDate = query["date.to"] ? new Date(query["date.to"]) : undefined;

    const orders = await prisma.salesOrders.findMany({
        where: {
            ...(salesRepId && { salesRepId }),
            ...(fromDate &&
                toDate && {
                    createdAt: {
                        gte: fromDate,
                        lte: toDate,
                    },
                }),
        },
        select: {
            grandTotal: true,
            payments: {
                where: {
                    ...(fromDate &&
                        toDate && {
                            createdAt: {
                                gte: fromDate,
                                lte: toDate,
                            },
                        }),
                },
                select: {
                    amount: true,
                },
            },
        },
    });

    let totalReceived = 0;
    let totalExpected = 0;

    for (const order of orders) {
        totalExpected += order.grandTotal;
        totalReceived += order.payments.reduce((sum, p) => sum + p.amount, 0);
    }

    const pendingPayments = totalExpected - totalReceived;

    // Calculate % change compared to last month
    let percentChange = null;
    if (fromDate && toDate) {
        const lastMonthFrom = subMonths(startOfMonth(fromDate), 1);
        const lastMonthTo = endOfMonth(lastMonthFrom);

        const lastMonthOrders = await prisma.salesOrders.findMany({
            where: {
                ...(salesRepId && { salesRepId }),
                createdAt: {
                    gte: lastMonthFrom,
                    lte: lastMonthTo,
                },
            },
            select: {
                payments: {
                    where: {
                        createdAt: {
                            gte: lastMonthFrom,
                            lte: lastMonthTo,
                        },
                    },
                    select: {
                        amount: true,
                    },
                },
            },
        });

        const lastMonthTotal = lastMonthOrders.reduce(
            (sum, o) =>
                sum + o.payments.reduce((pSum, p) => pSum + p.amount, 0),
            0,
        );

        if (lastMonthTotal > 0) {
            percentChange =
                ((totalReceived - lastMonthTotal) / lastMonthTotal) * 100;
        }
    }

    return {
        totalReceived,
        pendingPayments,
        percentChange,
        count: orders.length,
    };
};
