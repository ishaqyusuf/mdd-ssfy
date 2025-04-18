"use server";

import { OrderItemProductionAssignments, prisma, Prisma } from "@/db";
import { lastId } from "@/lib/nextId";
import { percent, sum } from "@/lib/utils";
import dayjs from "dayjs";

import { salesOverviewDto } from "../_common/data-access/dto/sales-item-dto";
import { typedFullSale } from "../_common/data-access/sales-dta";
import { resetSalesStatAction } from "../_common/data-actions/sales-stat-control.action";
import {
    SalesIncludeAll,
    SalesOverviewIncludes,
} from "../_common/utils/db-utils";
import { createSaleStat, statStatus } from "../_common/utils/sales-utils";
import { AsyncFnType } from "../../type";
import { TypedSalesStat } from "../types";

export async function loadSalesWithoutStats() {
    // });
    const sales = await prisma.salesOrders.findMany({
        where: {
            type: "order",
        },
        select: {
            _count: {
                select: {
                    assignments: true,
                    itemControls: true,
                },
            },
            id: true,
            createdAt: true,
            itemControls: {
                select: {
                    _count: {
                        select: {
                            qtyControls: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    const transformed = sales.map((s) => {
        return {
            ...s,
            qtyCounts: sum(s.itemControls.map((a) => a._count.qtyControls)),
        };
    });
    console.log(
        "NO QTY CONTROLS",
        transformed.filter((a) => !a.qtyCounts && !a._count.assignments),
    );
    console.log(
        "HAS QTY CONTROLs",
        transformed.filter((a) => a.qtyCounts),
    );
    return (
        transformed
            // .filter((a) => !a.qtyCounts)
            .map((a) => a.id)
    );
}
export async function updateSalesStats(ids) {
    return await Promise.all(
        ids.map(async (id) => {
            await resetSalesStatAction(id);
        }),
    );
}
async function loadSalesOverviews() {
    const sales = await prisma.salesOrders.findMany({
        where: {
            type: "order",
            stat: {
                none: {},
            },
        },
        include: SalesOverviewIncludes,
    });
    return sales;
}
async function loadSales() {
    const sales = await prisma.salesOrders.findMany({
        where: {
            type: "order",
            stat: {
                none: {},
            },
        },
        include: SalesIncludeAll,
    });
    return sales;
}
type LoadedSales = AsyncFnType<typeof loadSales>;
export async function salesStatisticsAction() {
    const sales = await loadSales();
    const stats: Partial<TypedSalesStat>[] = [];
    let resps: any = {
        stats: [] as Partial<TypedSalesStat>[],
        delivered: [],
        salesResps: [],
    };
    sales.map((s) => {
        const r = productionStats(s as any);
        r.stats.map((stat) => {
            stat.salesId = s.id;
            stat.percentage = percent(stat.score, stat.total);
            stat.status = statStatus(stat as any).status;
            stats.push(stat);
        });
        if (r.deliveryStats.length)
            resps.delivered.push({
                orderId: s.orderId,
                ...r.deliveryStats[0],
            });
        resps.salesResps.push(r);
    });
    console.log(stats.length);
    // await prisma.salesStat.createMany({
    //     data: stats as any,
    // });
    function statBy(k) {
        const res: any = {};
        Array.from(new Set(sales.map((s) => s[k]))).map((r) => {
            res[r || ("null" as any)] = sales.filter((s) => s[k] == r).length;
        });
        return res;
    }
    resps = {
        ...resps,
        allSales: sales.length,
        resps,
        statusList: Array.from(new Set(sales.map((s) => s.status))),
        prodStatuList: Array.from(new Set(sales.map((s) => s.prodStatus))),
        withProducers: sales.filter((s) => s.producer?.id).length,
        dykeWithProducers: sales.filter((s) => s.producer?.id && s.isDyke)
            .length,
        statistics: {
            status: statBy("status"),
            prod: statBy("prodStatus"),
        },
    };
    return resps;
}
function productionStats(order: LoadedSales[number]) {
    // get total produceables
    let totalProds = 0;
    let completedProds = 0;
    let assignedProd = 0;
    let delivered = 0;
    const resp = {
        stats: [] as Partial<TypedSalesStat>[],
        deliveryStats: [],
        withDeliveries: [],
        prods: [],
        assignments: [] as Partial<OrderItemProductionAssignments>[],
    };
    const prodId = order.producer?.id;
    order.items.map((item) => {
        function registerAssignment(
            totalQty,
            salesDoorId?,
            { lhQty = null, rhQty = null } = {},
        ) {
            resp.assignments.push({
                itemId: item.id,
                orderId: order.id,
                qtyAssigned: totalQty,
                lhQty,
                rhQty,
                assignedToId: prodId,
                assignedById: 1,
                salesDoorId,
            });
        }
        let totalItems = 0;
        if (order.isDyke) {
            if (item.dykeProduction) totalItems += item.qty;
            item.salesDoors.map((sd) => {
                // sd.totalQty
                const q = sum([sd.lhQty, sd.rhQty]);
                const q2 = sum([sd.totalQty]);
                // if (q2 != q) {
                // console.log({ q, q2 });
                // }
                totalItems += q;
            });
        } else {
            if (item.swing || item.assignments.length)
                totalItems += Number(item.qty);
            if (prodId && !item.assignments?.length) {
                if (item.dykeProduction) {
                    registerAssignment(totalItems);
                }
                item.salesDoors.map(({ id, totalQty, lhQty, rhQty }) => {
                    console.log({ totalQty, lhQty, rhQty });
                    registerAssignment(totalQty, id, { lhQty, rhQty });
                });
            }
        }
        if (item.swing || item.assignments.length) {
            totalProds += Number(item.qty);
            assignedProd += item.assignments
                .map(({ lhQty, rhQty, qtyAssigned, submissions }) => {
                    const s1 = sum([lhQty, rhQty]);
                    const s2 = sum([qtyAssigned]);

                    completedProds += submissions
                        .map((a) => {
                            const s1 = sum([a.lhQty, a.rhQty]);
                            const s2 = sum([a.qty]);
                            return s2;
                        })
                        .filter((s) => s > 0)
                        .reduce((a, b) => a + b, 0);

                    return s2;
                })
                .filter((s) => s > 0)
                .reduce((a, b) => a + b, 0);
            if (prodId && !item.assignments?.length) {
                // console.log("REGISTERING OLD SALE");
                registerAssignment(totalItems);
                // resp.assignments.push({
                //     itemId: item.id,
                //     orderId: order.id,
                //     qtyAssigned: totalItems,
                //     assignedToId: prodId,
                //     assignedById: 1,
                // });
            }
        }
        totalProds += totalItems;
    });

    resp.stats = [
        // {
        //     total: totalProds,
        //     type: "prod",
        //     score: completedProds,
        // },
        // {
        //     total: totalProds,
        //     type: "prodAssignment",
        //     score: assignedProd,
        // },
        // {
        //     total: totalProds,
        //     score: delivered,
        //     type: "dispatch",
        // },
    ];
    return resp;
}
export async function salesStatUpgrade() {
    const sales = await loadSalesOverviews();
    const data = {
        stats: [] as Partial<TypedSalesStat>[],
        submissions: [] as Prisma.OrderProductionSubmissionsCreateManyInput[],
        assignments:
            [] as Prisma.OrderItemProductionAssignmentsCreateManyInput[],
        deliveries: [] as Prisma.OrderDeliveryCreateManyInput[],
        deliveryItems: [] as Prisma.OrderItemDeliveryCreateManyInput[],
    };
    const typedSales = sales.map((s) => ({
        ...salesOverviewDto(typedFullSale(s)),
        raw: s,
    }));
    let lastAssignmentId = await lastId(prisma.orderItemProductionAssignments);
    let lastSubmitId = await lastId(prisma.orderProductionSubmissions);
    let lastDeliveryId = await lastId(prisma.orderDelivery);
    let lastdeliverItemId = await lastId(prisma.orderItemDelivery);
    typedSales.map((sale) => {
        const dd = dayjs()
            .subtract(30, "days")
            .diff(sale.raw.createdAt, "days");
        const producer = sale.raw?.producer;
        const producerId = producer?.id;
        const statData = {
            produceable: 0,
            deliverable: 0,
            assigned: 0,
            delivered: 0,
            produced: 0,
        };
        sale.itemGroup.map((grp) => {
            grp?.items?.map((item) => {
                // const analytics = item.analytics
                const { pending, success, control } = item.analytics || {};

                statData.deliverable += sum([
                    pending.delivery?.total,
                    success?.delivery?.total,
                ]);
                statData.produceable += sum([
                    pending.assignment?.total,
                    success?.assignment?.total,
                ]);
                function createAssignment({
                    qtyAssigned,
                    salesDoorId = null,
                    lhQty = null,
                    rhQty = null,
                    produceable,
                }) {
                    const id = ++lastAssignmentId;
                    const qty = sum([lhQty, rhQty]) || qtyAssigned;
                    if (produceable) {
                        statData.assigned += qty;
                        statData.produced += qty;
                    }
                    data.assignments.push({
                        id,
                        rhQty,
                        lhQty,
                        assignedById: 1,
                        itemId: item.salesItemId,
                        orderId: item.orderId,
                        assignedToId: producerId,
                        dueDate: sale.raw.prodDueDate,
                        salesDoorId,
                        qtyAssigned,
                    });
                    const submissionId = ++lastSubmitId;
                    data.submissions.push({
                        id: submissionId,
                        qty: qtyAssigned,
                        rhQty,
                        lhQty,
                        assignmentId: id,
                        salesOrderId: item.orderId,
                        salesOrderItemId: item.salesItemId,
                    });
                    const deliveryId = ++lastDeliveryId;
                    data.deliveries.push({
                        id: deliveryId,
                        deliveryMode: sale.raw?.deliveryOption || "unknown",
                        salesOrderId: item.orderId,
                        createdById: 1,
                        status: "completed",
                    });
                    const deliveryItemId = ++lastdeliverItemId;
                    data.deliveryItems.push({
                        id: deliveryItemId,
                        orderItemId: item.salesItemId,
                        orderDeliveryId: deliveryId,
                        lhQty,
                        rhQty,
                        qty: qtyAssigned,
                        orderId: item.orderId,
                        orderProductionSubmissionId: submissionId,
                    });
                }
                if (producerId && !item.assignments?.length) {
                    if (pending.assignment?.total) {
                        createAssignment({
                            lhQty: pending.assignment.lh,
                            rhQty: pending.assignment.rh,
                            qtyAssigned: pending.assignment.total,
                            salesDoorId: item.doorItemId,
                            produceable: control.produceable,
                        });
                    }
                } else {
                    // if (dd > 0) {
                    //     if (
                    //         !item.assignments?.length &&
                    //         pending.assignment?.total
                    //     ) {
                    //         console.log("...");
                    //     }
                    // }
                }
                statData.produced += success?.production?.total || 0;
                statData.delivered += success.delivery?.total || 0;
                statData.assigned += success.assignment?.total || 0;

                if (item.assignments.length) {
                    if (!pending.production?.total) {
                        console.log("COMPLETED");
                    }
                }
            });
            // if (deliveredAt) {
            //     const assignments = sale.itemGroup
            //         .map((grp) => {
            //             grp?.items
            //                 ?.map((item) => {
            //                     return data.assignments.filter(
            //                         (a) => a.itemId == item.salesItemId
            //                     );
            //                 })
            //                 .flat();
            //         })
            //         .flat();
            //     console.log(assignments.length);
            // }
        });
        //     data.stats.push(
        //         createSaleStat(
        //             "dispatch",
        //             statData.delivered,
        //             statData.deliverable,
        //             sale.raw.id
        //         )
        //     );
        //     data.stats.push(
        //         createSaleStat(
        //             "prod",
        //             statData.produced,
        //             statData.produceable,
        //             sale.raw.id
        //         )
        //     );
        //     data.stats.push(
        //         createSaleStat(
        //             "prodAssignment",
        //             statData.produceable,
        //             statData.assigned,
        //             sale.raw.id
        //         )
        //     );
    });
    return data;
}
