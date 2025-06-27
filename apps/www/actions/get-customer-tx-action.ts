"use server";

import { pageQueryFilter } from "@/app/(clean-code)/_common/utils/db-utils";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { AsyncFnType } from "@/types";
import { CustomerTransactionMeta, ISalesPaymentMeta } from "@/types/sales";
import { salesAccountingQueryMetaData } from "@/utils/db/query.sales-accounting";
import { PaymentMethods, SalesHaving } from "@/utils/constants";
import { __getPaymentCountBySales } from "./cached-sales-accounting";
import { padStart } from "lodash";

export type GetSalesCustomerTx = AsyncFnType<
    typeof getCustomerTransactionsAction
>;
export type CustomerTransactionType = "wallet" | "transaction";
export async function getCustomerTransactionsAction(query: SearchParamsType) {
    if (query?.["sales.having"]) {
        const counts = await __getPaymentCountBySales();
        switch (query?.["sales.having"] as SalesHaving) {
            case "Multiple Payments":
                query["sales.ids"] = counts
                    .filter((a) => a.paymentCount > 1)
                    .map((a) => a.id);
                break;
            case "Single Payment":
                query["sales.ids"] = counts
                    .filter((a) => a.paymentCount == 1)
                    .map((a) => a.id);
                break;
            case "Duplicate Payment":
                query["sales.ids"] = counts
                    .filter((a) => {
                        a.hasDuplicate;
                    })
                    .map((a) => a.id);
                break;
        }
    }
    const { model, response, where, searchMeta } =
        await salesAccountingQueryMetaData(query);

    const list = await prisma.customerTransaction.findMany({
        where,
        ...pageQueryFilter(query),
        select: {
            id: true,
            statusNote: true,
            amount: true,
            createdAt: true,
            description: true,
            status: true,
            paymentMethod: true,
            meta: true,
            history: {
                select: {
                    id: true,
                    authorName: true,
                    status: true,
                    createdAt: true,
                    description: true,
                    reason: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
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
                    status: true,
                    meta: true,
                    order: {
                        select: {
                            orderId: true,
                            id: true,
                            grandTotal: true,
                            extraCosts: {
                                where: {
                                    type: {
                                        in: ["Labor", "Delivery"],
                                    },
                                },
                                select: {
                                    type: true,
                                    amount: true,
                                },
                            },
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
    // const pageInfo = await getPageInfo(
    //     query,
    //     where,
    //     prisma.customerTransaction,
    // );
    return await response(
        list.map((item) => {
            const amount = formatMoney(Math.abs(item.amount));
            const orderIds = item.salesPayments.map((a) => a.order.orderId);
            const orderIdsString = orderIds
                .join(", ")
                .replace(/,([^,]*)$/, " &$1");

            const paymentMethod = item.paymentMethod as PaymentMethods;
            const description = item.description;
            const salesReps = Array.from(
                new Set(
                    item.salesPayments?.map((s) => s.order?.salesRep?.name),
                ),
            );
            const meta = (item.meta || {}) as any as CustomerTransactionMeta;
            const spMeta = item.salesPayments?.[0]
                ?.meta as any as ISalesPaymentMeta;
            // meta.checkNo
            const spStatus = item?.salesPayments?.[0]?.status;
            let status = item.status;
            if (
                paymentMethod == "link" &&
                status?.toLocaleLowerCase() == "pending"
            )
                status = spStatus;
            const { history } = item;
            const orderCount = orderIds?.length;
            const order = item?.salesPayments?.[0]?.order;
            const ordersCount = item?.salesPayments?.length;
            const multiSales = ordersCount > 1;
            const laborCost = order?.extraCosts?.find(
                (a) => a.type == "Labor",
            )?.amount;
            const deliveryCost = order?.extraCosts?.find(
                (a) => a.type == "Delivery",
            )?.amount;
            return {
                checkNo: meta?.checkNo || spMeta?.checkNo,
                reason: item?.history?.[0]?.reason,
                uuid: item.id,
                id: item.id,
                paymentNo: padStart(item.id?.toString(), 5, "0"),
                authorName: item.author?.name,
                status,
                // status: ,
                createdAt: item.createdAt,
                amount,
                paymentMethod,
                description,
                ordersCount,
                orderIds: orderIdsString,
                salesReps,
                sales: item.salesPayments,
                meta,
                history,
                laborCost,
                deliveryCost,
                grandTotal: order?.grandTotal,
            };
        }),
    );
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
