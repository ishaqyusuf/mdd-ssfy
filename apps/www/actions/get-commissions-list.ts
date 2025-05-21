"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { formatDate, timeAgo } from "@/lib/use-day";
import { commissionQueryMetaData } from "@/utils/db/query.commissions";

export async function getCommissionsList(query: SearchParamsType) {
    const { model, response, where, searchMeta } =
        await commissionQueryMetaData(query);
    const payments = await model.findMany({
        where,
        ...searchMeta,
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
    return await response(
        payments.map((payment) => {
            return {
                id: payment.id,
                paymentId: `CP${formatDate(payment.createdAt, "YYYY")}${String(payment.id)?.padStart(3)}`,
                paymentDate: timeAgo(payment.createdAt),
                amount: payment.amount,
                paidTo: payment.user?.name,
                orderNo: payment?.order?.orderId,
                status: payment.status,
            };
        }),
    );
}
