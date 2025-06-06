"use server";

import {
    getPageInfo,
    pageQueryFilter,
} from "@/app/(clean-code)/_common/utils/db-utils";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { AsyncFnType } from "@/types";
import { whereCustomerTx } from "@/utils/db/where.customer-transactions";
import { ISalesPaymentMeta } from "@/types/sales";

export type GetSalesCustomerTx = AsyncFnType<
    typeof getCustomerTransactionsAction
>;
export type CustomerTransactionType = "wallet" | "transaction";
export async function getCustomerTransactionsAction(query: SearchParamsType) {
    const where = whereCustomerTx(query);
    const data = await prisma.customerTransaction.findMany({
        where,
        ...pageQueryFilter(query),
        select: {
            id: true,
            amount: true,
            createdAt: true,
            description: true,
            status: true,
            paymentMethod: true,
            meta: true,
            author: {
                select: {
                    name: true,
                    id: true,
                },
            },
            wallet: {
                select: {
                    accountNo: true,
                },
            },
            salesPayments: {
                where: {
                    deletedAt: null,
                    order: {
                        type: "order" as SalesType,
                    },
                },
                select: {
                    amount: true,

                    order: {
                        select: {
                            orderId: true,
                            id: true,
                            salesRep: {
                                select: {
                                    name: true,
                                    id: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    const pageInfo = await getPageInfo(
        query,
        where,
        prisma.customerTransaction,
    );
    return {
        ...pageInfo,
        data: data.map((item) => {
            const amount = formatMoney(Math.abs(item.amount));
            const orderIds = item.salesPayments
                .map((a) => a.order.orderId)
                .join(", ")
                .replace(/,([^,]*)$/, " &$1");

            const paymentMethod = item.paymentMethod;
            const description = item.description;
            const salesReps = Array.from(
                new Set(
                    item.salesPayments?.map((s) => s.order?.salesRep?.name),
                ),
            );
            const meta = item.meta as any as ISalesPaymentMeta;
            // meta.checkNo
            return {
                checkNo: meta?.checkNo,
                uuid: item.id,
                id: item.id,
                authorName: item.author?.name,
                status: item.status,
                createdAt: item.createdAt,
                amount,
                paymentMethod,
                description,
                orderIds,
                salesReps,
                sales: item.salesPayments,
            };
        }),
    };
}

export type GetSalesCustomerTxOverview = AsyncFnType<
    typeof getSalesCustomerTxOverviewAction
>;
export async function getSalesCustomerTxOverviewAction(id) {
    const resp = await prisma.customerTransaction.findUnique({
        where: {
            id,
        },
        include: {
            author: true,
            wallet: true,
            squarePayment: {
                select: {
                    id: true,
                },
            },
            salesPayments: {
                where: {
                    deletedAt: null,
                },
                include: {
                    order: true,
                    checkout: {
                        select: {
                            id: true,
                        },
                    },
                },
            },
        },
    });
    return resp;
}
