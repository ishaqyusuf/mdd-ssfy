"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { formatDate, timeAgo } from "@/lib/use-day";
import { queryResponse } from "@/utils/query-response";

export async function getCommissionsList(query: SearchParamsType) {
    const userId = query["user.id"];

    const payments = await prisma.payroll.findMany({
        where: {
            userId: userId ? +userId : undefined,
        },
        take: 20,
        orderBy: {
            createdAt: "desc",
        },
        select: {
            uid: true,
            id: true,
            createdAt: true,
            amount: true,
            description: true,
            status: true,
            itemUid: true,
            order: {
                select: {
                    id: true,
                    orderId: true,
                },
            },
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
    return await queryResponse(
        payments.map((payment) => {
            return {
                id: payment.id,
                paymentId: `CP${formatDate(payment.createdAt, "YYYY")}${String(payment.id)?.padStart(3)}`,
                paymentDate: timeAgo(payment.createdAt),
                amount: payment.amount,
                paidTo: payment.user?.name,
            };
        }),
    );
}
