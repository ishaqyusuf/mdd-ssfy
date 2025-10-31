"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

import { prisma } from "@/db";
import {
    getPageInfo,
    pageQueryFilter,
} from "@/app/(clean-code)/_common/utils/db-utils";
import { AsyncFnType } from "@/app/(clean-code)/type";
import { transformDispatchList } from "./dispatch-list-dto";
import { whereDispatch } from "@/utils/db/where.dispatch";

export type LoadDispatchListAction = AsyncFnType<typeof loadDispatchListAction>;
export type GetDispatchListActions = AsyncFnType<typeof getDispatchListActions>;
export async function getDispatchListActions(query: SearchParamsType) {
    const where = whereDispatch(query);
    const data = await loadDispatchListAction(query);
    const pageInfo = await getPageInfo(query, where, prisma.orderDelivery);
    return {
        pageCount: pageInfo.pageCount,
        pageInfo,
        data: data.map(transformDispatchList),
        meta: {
            totalRowCount: pageInfo.totalItems,
        },
    };
}
export async function getSaleDispatchListOverview(salesId) {
    const dispatches = await loadDispatchListAction({
        "sales.id": salesId,
    });
    return dispatches.map((d) => transformDispatchList(d));
}

export async function loadDispatchListAction(query: SearchParamsType) {
    const where = whereDispatch(query);
    const data = await prisma.orderDelivery.findMany({
        where,
        ...pageQueryFilter(query),
        select: {
            id: true,
            status: true,
            createdAt: true,
            deliveryMode: true,
            driver: true,
            createdBy: true,
            items: {
                include: {
                    submission: {
                        select: {
                            qty: true,
                            lhQty: true,
                            rhQty: true,
                            assignment: {
                                select: {
                                    salesDoor: {
                                        select: {
                                            dimension: true,
                                            swing: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    salesItem: {
                        select: {
                            swing: true,
                            qty: true,
                            description: true,
                            housePackageTool: {
                                select: {
                                    stepProduct: {
                                        select: {
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            order: {
                select: {
                    orderId: true,
                    id: true,
                    amountDue: true,
                },
            },
        },
    });
    return data;
}
