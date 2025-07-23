"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { formatDate, timeAgo } from "@/lib/use-day";
import { commissionPaymentQueryMetaData } from "@/utils/db/query.commission-payment";
import { queryResponse } from "@/utils/query-response";

export async function getCommissionPayments(query: SearchParamsType) {
    const { model, response, where, searchMeta } =
        await commissionPaymentQueryMetaData(query);
    const payments = await model.findMany({
        where,
        ...searchMeta,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
    return response(
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
