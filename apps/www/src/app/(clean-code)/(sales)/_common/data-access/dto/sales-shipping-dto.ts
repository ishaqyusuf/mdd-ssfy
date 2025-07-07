import { assign, padStart } from "lodash";
import { GetFullSalesDataDta } from "../sales-dta";
import {
    Assignments,
    DeliveryBreakdown,
    FullSalesDeliveries,
    Qty,
    qtyDiff,
    SalesOverviewDto,
} from "./sales-item-dto";
import { sum } from "@/lib/utils";
import { formatDate } from "@/lib/use-day";
import { GetSalesDispatchListDta } from "../sales-dispatch-dta";
import { SalesDispatchStatus } from "../../../types";
import { calculateDeliveryBreakdownPercentage } from "../../utils/dispatch-utils";

export type SalesDispatchListItem = GetSalesDispatchListDta["data"][number];
export type SalesDispatchListDto = ReturnType<typeof salesDispatchListDto>;
export function salesDispatchListDto(data: SalesDispatchListItem) {
    return {
        orderDate: data.order.createdAt,
        order: {
            orderId: data.order.orderId,
            id: data.order.id,
        },
        dispatchDate: data.createdAt,
        dispatchId: data.id,
        uuid: data.id,
        status: data.status as SalesDispatchStatus,
        salesRep: data.order.salesRep.name,
        shipping: {
            address: data.order.shippingAddress.address1,
        },
        customer: {
            address: data.order.customer?.address,
            name:
                data.order.customer?.businessName || data.order.customer?.name,
            // name: data.order.
        },
        title: dispatchTitle(data.id),
    };
}
export function dispatchTitle(id, prefix = "#DISPATCH") {
    return `${prefix}-${padStart(id.toString(), 4, "0")}`;
}
export type SalesShippingDto = ReturnType<typeof salesShippingDto>;
export function salesShippingDto(
    overview: SalesOverviewDto,
    data: GetFullSalesDataDta
) {
    //    data.deliveries
    const dispatchStat = overview.stat.calculatedStats.dispatchCompleted;
    const dispatchableItemList = overview?.itemGroup
        ?.map((grp) => {
            return grp?.items?.map((item, uid) => {
                const analytics = item.analytics;
                console.log(analytics);

                const pendingDelivery = analytics.pending.delivery?.total;
                const totalDelivered = analytics.success.delivery?.total;
                const totalProd = analytics.success.production?.total || 0;
                const deliverable =
                    (analytics.pending.production
                        ? totalProd
                        : totalDelivered + pendingDelivery) - totalDelivered;
                const assignments = item.assignments;

                const deliverableSubmissions = assignments
                    .map((assignment) => {
                        return assignment.submissions
                            .map((sub) => {
                                // console.log(sub.)
                                let pendingDelivery = sub.qty;
                                // console.log(pendingDelivery);

                                assignment.deliveries
                                    .filter((d) => d.submissionId == sub.id)
                                    .map((s) => {
                                        pendingDelivery = qtyDiff(
                                            pendingDelivery,
                                            s.qty
                                        );
                                    });
                                return {
                                    qty: pendingDelivery,
                                    subId: sub.id,
                                };
                            })
                            .filter((s) => s.qty.total > 0);
                    })
                    .flat();

                let deliverableQty = !analytics.control.produceable
                    ? qtyDiff(
                          analytics.pending.delivery,
                          analytics.success.delivery,
                          true
                      )
                    : deliverableSubmissions[0]?.qty || {};
                // console.log(deliverableQty);
                deliverableSubmissions?.map((s, i) => {
                    if (i > 0)
                        deliverableQty = qtyDiff(deliverableQty, s, true);
                });
                return {
                    hasSwing: item.hasSwing,
                    swing: item.swing,
                    size: item.size,
                    id: item.salesItemId,
                    uid: `${item.salesItemId}-${uid}`,
                    section: grp.sectionTitle,
                    totalQty: item.totalQty,
                    pendingDelivery,
                    totalDelivered,
                    analytics,
                    title: item.title,
                    deliverable,
                    deliverableSubmissions,
                    deliverableQty,
                    assignments,
                };
            });
        })
        .flat();
    let deliveries = data.deliveries.map((d) => {
        const totalDeliveries = sum(d.items.map((i) => i.qty));
        const items = d.items.map((dItem) => {
            console.log(dItem);

            return {
                id: dItem.id,
                itemId: dItem.orderItemId,
                submissionId: dItem.orderProductionSubmissionId,
                qty: {
                    lh: dItem.lhQty,
                    rh: dItem.rhQty,
                    qty: dItem.lhQty || dItem.rhQty ? null : dItem.qty,
                    total: dItem.qty,
                } as Qty,
            };
        });
        console.log(items);

        return {
            id: d.id,
            date: formatDate(d.createdAt),
            title: dispatchTitle(d.id),
            score: totalDeliveries,
            total: dispatchStat.total,
            status: d.status,
            items,
        };
    });

    return {
        list: deliveries,
        dispatchableItemList,
        deliveryMode: data.deliveryOption,
        orderId: data.id,
    };
}
export function deliveriesByStatus(
    items: { qty; status: SalesDispatchStatus }[]
): DeliveryBreakdown {
    const resp: DeliveryBreakdown = {
        status: {
            delivered: { total: 0 },
            inProgress: { total: 0 },
            queue: { total: 0 },
            backorder: { total: 0 },
        },
    };
    items.map(({ status, qty }) => {
        switch (status) {
            case "completed":
                resp.status.delivered.total += qty;
                break;
            case "in progress":
                resp.status.inProgress.total += qty;
                break;
            case "cancelled":
                break;

            default:
                resp.status.queue.total += qty;
        }
    });
    return resp;
}
export function deliveryBreakdownDto(
    deliveries: FullSalesDeliveries,
    assignments?: Assignments,
    totalDeliverables?
): DeliveryBreakdown {
    console.log(totalDeliverables);

    const deliveryItems = assignments
        ? assignments
              ?.map((a) => a.submissions?.map((s) => s.itemDeliveries).flat())
              .flat()
        : deliveries.map((d) => d.items.flat()).flat();
    const deliveryByStat = deliveriesByStatus(
        deliveryItems.map((item) => {
            const status = (deliveries.find((d) => d.id == item.orderDeliveryId)
                ?.status || "queue") as SalesDispatchStatus;
            return {
                status,
                qty: item.qty,
            };
        })
    );
    return calculateDeliveryBreakdownPercentage(
        deliveryByStat,
        totalDeliverables
    );
}
