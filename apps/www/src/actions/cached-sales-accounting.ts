"use server";

import {
    SalesPaymentStatus,
    SalesType,
} from "@/app-deps/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { unstable_cache } from "next/cache";

export async function __getPaymentCountBySales() {
    const tags = ["sales-payment-count"];
    const fn = async () => {
        const ls = await prisma.salesOrders.findMany({
            where: {
                type: "order" as SalesType,
            },
            select: {
                id: true,
                orderId: true,
                payments: {
                    where: {
                        status: "success" as SalesPaymentStatus,
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                        transactionId: true,
                        amount: true,
                    },
                },
            },
        });
        return ls.map((l) => {
            const paymentIds = l.payments.map((a) => a.id);
            const hasDuplicate = l.payments.some(
                (a, i) =>
                    l.payments.findIndex((b) => b.amount === a.amount) != i
            );
            return {
                id: l.id,
                orderNo: l.orderId,
                paymentIds,
                paymentCount: paymentIds.length,
                hasDuplicate,
            };
        });
    };
    return unstable_cache(fn, tags, { tags })();
}
