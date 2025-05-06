"use server";

import {
    inifinitePageInfo,
    pageQueryFilter,
} from "@/app/(clean-code)/_common/utils/db-utils";
import { authId } from "@/app/(v1)/_actions/utils";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { composeSalesStatKeyValue } from "@/data/compose-sales";
import { prisma, Prisma } from "@/db";
import { sum } from "@/lib/utils";
import { AsyncFnType } from "@/types";
import { whereSales } from "@/utils/db/where.sales";

import { overallStatus } from "../../data-access/dto/sales-stat-dto";
import { dueDateAlert } from "../../utils/production-utils";

export type GetProductionListPage = AsyncFnType<
    typeof getProductionListPageAction
>;
export type GetProductionList = AsyncFnType<typeof getProductionListAction>;
export async function getProductionTasksListPageAction(
    query: SearchParamsType,
) {
    const q = { ...query };
    q["production.assignedToId"] = await authId();

    return await getProductionListPageAction(q);
}
export async function getProductionListPageAction(
    query: SearchParamsType,
    admin = false,
) {
    const excludes: (keyof SearchParamsType)[] = [
        "sort",
        "size",
        "start",
        "sales.type",
    ];
    if (!admin) excludes.push("production.assignedToId");

    const q = Object.entries(query)?.filter(
        ([a, b]) => b && !excludes.includes(a as any),
    );
    const queryCount = q?.length;
    const assignedToId = query["production.assignedToId"];
    const dueToday =
        !query.start && !queryCount
            ? await getProductionListAction({
                  "sales.type": query["sales.type"],
                  "production.assignedToId": assignedToId,
                  "production.status": "due today",
              })
            : [];
    const pastDue =
        !query.start && !queryCount
            ? await getProductionListAction({
                  "sales.type": query["sales.type"],
                  "production.assignedToId": assignedToId,
                  "production.status": "past due",
              })
            : [];
    const customs = [...dueToday, ...pastDue]
        .map(transformProductionList)
        // .sort(
        //     (a, b) =>
        //         (new Date(b.alert.date) as any) -
        //         (new Date(a.alert.date) as any),
        // )
        .filter((a) => !a.completed);
    // const excludesIds = [...dueToday, ...pastDue].map((a) => a.id);
    const excludesIds = customs.map((a) => a.id);
    const prodList =
        !admin && !queryCount
            ? []
            : await getProductionListAction({
                  ...query,
                  //   "production.status": "part assigned",
              });
    const others = prodList.filter((p) => !excludesIds?.includes(p.id));
    // console.log({ prodList });
    const result = await inifinitePageInfo(
        query,
        whereSales(query),
        prisma.salesOrders,
        [...customs, ...others.map(transformProductionList)],
        // [...dueToday, ...pastDue, ...others].map(transformProductionList)
    );
    return result;
}
export async function getProductionListAction(query: SearchParamsType) {
    const where = whereSales(query);

    const whereAssignments: Prisma.OrderItemProductionAssignmentsWhereInput[] =
        (
            Array.isArray(where?.AND)
                ? where.AND?.map((a) => a.assignments?.some).filter(Boolean)
                : where?.assignments
                  ? [where?.assignments]
                  : []
        ) as any;

    const data = await prisma.salesOrders.findMany({
        where,
        ...pageQueryFilter(query),
        select: {
            customer: true,
            billingAddress: true,
            id: true,
            orderId: true,
            salesRep: {
                select: { name: true },
            },
            stat: true,
            itemControls: {
                select: {
                    qtyControls: true,
                    assignments: {
                        select: {
                            id: true,
                        },
                    },
                },
            },
            assignments: {
                where: {
                    deletedAt: null,
                    AND:
                        whereAssignments?.length > 1
                            ? whereAssignments
                            : undefined,
                    ...(whereAssignments?.length == 1
                        ? whereAssignments[0]
                        : {}),
                },
                select: {
                    submissions: {
                        where: {
                            deletedAt: null,
                        },
                        select: {
                            lhQty: true,
                            qty: true,
                            rhQty: true,
                        },
                    },
                    lhQty: true,
                    rhQty: true,
                    qtyAssigned: true,
                    dueDate: true,
                    assignedTo: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });
    return data;
}
function transformProductionList(item: GetProductionList[number]) {
    // item.assignments;
    const dueDate = item.assignments.map((d) => d.dueDate).filter(Boolean);

    const alert = dueDateAlert(dueDate);

    const totalAssigned = sum(
        item.assignments.map((p) => p.qtyAssigned || sum([p.lhQty, p.rhQty])),
    );
    const stats = composeSalesStatKeyValue(item.stat);

    const totalCompleted = sum(
        item.assignments.map((a) =>
            sum(a.submissions.map((s) => s.qty || sum([s.lhQty, s.rhQty]))),
        ),
    );
    const completed = totalAssigned == totalCompleted;
    // if (completed) alert.date = null;

    return {
        completed,
        totalAssigned,
        totalCompleted,
        orderId: item.orderId,
        alert,
        customer: item.customer?.name || item.customer?.businessName,

        salesRep: item?.salesRep?.name,
        assignedTo: Array.from(
            new Set(item.assignments.map((a) => a.assignedTo?.name)),
        ).join(" & "),
        uuid: item.orderId,
        id: item.id,
        stats,
        status: overallStatus(item.stat),
    };
}
