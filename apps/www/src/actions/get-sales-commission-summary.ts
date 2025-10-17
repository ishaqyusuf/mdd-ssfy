import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";

export const getSalesCommissionSummary = async (query: SearchParamsType) => {
    const salesRepId = query["salesRep.id"];
    const fromDate = query["date.from"]
        ? new Date(query["date.from"])
        : undefined;
    const toDate = query["date.to"] ? new Date(query["date.to"]) : undefined;
    const commissionFilter = query["commission.filter"] || "all";

    const whereClause: any = {
        type: "COMMISSION",
    };

    if (salesRepId) {
        whereClause.userId = salesRepId;
    }

    if (fromDate && toDate) {
        whereClause.createdAt = {
            gte: fromDate,
            lte: toDate,
        };
    }

    if (commissionFilter === "earned") {
        whereClause.status = { in: ["COMPLETED", "PAID"] };
    } else if (commissionFilter === "pending") {
        whereClause.status = { in: ["PENDING", "PROCESSING"] };
    }

    const commissions = await prisma.payroll.findMany({
        where: whereClause,
        select: {
            amount: true,
            createdAt: true,
        },
    });

    const totalAmount = commissions.reduce((sum, item) => sum + item.amount, 0);

    // Compare to last month's total
    let percentChange = null;
    if (fromDate && toDate) {
        const lastMonthFrom = subMonths(startOfMonth(fromDate), 1);
        const lastMonthTo = endOfMonth(lastMonthFrom);

        const lastMonthCommissions = await prisma.payroll.findMany({
            where: {
                userId: salesRepId,
                type: "COMMISSION",
                status: whereClause.status,
                createdAt: {
                    gte: lastMonthFrom,
                    lte: lastMonthTo,
                },
            },
            select: {
                amount: true,
            },
        });

        const lastMonthTotal = lastMonthCommissions.reduce(
            (sum, item) => sum + item.amount,
            0,
        );
        if (lastMonthTotal > 0) {
            percentChange =
                ((totalAmount - lastMonthTotal) / lastMonthTotal) * 100;
        }
    }

    return {
        totalAmount: 0,
        percentChange,
        count: commissions?.length,
    };
};
