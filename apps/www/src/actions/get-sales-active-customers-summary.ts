import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";

export const getSalesActiveCustomers = async (query: SearchParamsType) => {
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
            customer: {
                select: {
                    phoneNo: true,
                },
            },
        },
    });

    const uniqueCustomers = new Set(
        orders.map((o) => o.customer?.phoneNo).filter(Boolean),
    );

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
                customer: {
                    select: {
                        phoneNo: true,
                    },
                },
            },
        });

        const lastMonthCustomers = new Set(
            lastMonthOrders.map((o) => o.customer?.phoneNo).filter(Boolean),
        );

        const currentCount = uniqueCustomers.size;
        const lastMonthCount = lastMonthCustomers.size;

        if (lastMonthCount > 0) {
            percentChange =
                ((currentCount - lastMonthCount) / lastMonthCount) * 100;
        }
    }

    return {
        activeCustomerCount: uniqueCustomers.size,
        percentChange,
    };
};
