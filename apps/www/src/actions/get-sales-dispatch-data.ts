"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { qtyMatrixDifference, qtyMatrixSum } from "@/utils/sales-control-util";

import { getSalesItemsOverviewAction } from "./get-sales-items-overview-action";
import { laborRate } from "@/utils/sales-utils";

export async function getSalesDispatchDataAction(orderId) {
    const overview = await getSalesItemsOverviewAction(orderId);
    // const dispatchList =  await prisma.
    const availableDispatchQty = sum(
        overview.items.map((item) => item.analytics.dispatch.available.qty),
    );
    const pendingDispatchQty = sum(
        overview.items.map((item) => item.analytics.dispatch.pending?.qty),
    );
    const dispatchedQty = sum(
        overview.items.map((item) => item.analytics.deliveredQty),
    );
    const pendingProductionQty =
        sum(
            overview.items
                ?.filter((a) => a.itemConfig?.production)
                .map((item) => item.analytics?.production?.pending?.qty),
        ) +
        sum(
            overview.items
                ?.filter((a) => a.itemConfig?.production)
                .map((item) => item.analytics?.assignment?.pending?.qty),
        );
    const dispatchables = overview.items.map((item) => {
        const currentDispatchQty = qtyMatrixSum(
            item.analytics.stats.dispatchAssigned,
            item.analytics.stats.dispatchCompleted,
            item.analytics.stats.dispatchInProgress,
        );
        const dispatchStat = item.analytics.deliverables;
        return {
            uid: item.controlUid,
            title: item.title,
            itemId: item.itemId,
            unitLabor: laborRate(
                overview?.orderMeta?.laborConfig?.rate,
                item.unitLabor,
            ),
            totalQty: item.qty.qty,
            doorId: item.doorId,
            dispatchStat,
            analytics: item.analytics,
            pendingSubmissions: item.analytics?.pendingSubmissions,
            subtitle: item.subtitle,
            availableQty: qtyMatrixDifference(
                item.itemConfig?.production
                    ? item.analytics.stats.prodCompleted
                    : item.analytics.stats.qty,
                currentDispatchQty,
            ),
        };
    });
    const deliveries = overview.deliveries.map((delivery) => {
        delivery.driver;
        return {
            ...delivery,
            items: delivery.items.map((item) => {
                const _item = overview.items.find((i) =>
                    i.analytics.submissionIds.includes(
                        item.orderProductionSubmissionId,
                    ),
                );
                const { controlUid, title, sectionTitle, subtitle } =
                    _item || {};
                return {
                    ...item,

                    item: {
                        controlUid,
                        title,
                        sectionTitle,
                        subtitle,
                    },
                };
            }),
        };
    });
    return {
        id: overview.orderId,
        orderUid: overview.orderNo,
        dispatchables,
        deliveries,
        order: overview.order,
        progress: {
            availableDispatchQty,
            dispatchedQty,
            pendingDispatchQty,
            pendingProductionQty,
        },
    };
}
