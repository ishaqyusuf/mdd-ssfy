"use server";

import { sum } from "@/lib/utils";
import { qtyMatrixDifference, qtyMatrixSum } from "@/utils/sales-control-util";

import { getSalesItemsOverviewAction } from "./get-sales-items-overview-action";

export async function getSalesDispatchDataAction(orderId) {
    const overview = await getSalesItemsOverviewAction(orderId);
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
            dispatchStat,
            subtitle: item.subtitle,
            availableQty: qtyMatrixDifference(
                item.itemConfig?.production
                    ? item.analytics.stats.prodCompleted
                    : item.analytics.stats.qty,
                currentDispatchQty,
            ),
        };
    });
    return {
        id: overview.orderId,
        orderUid: overview.orderId,
        dispatchables,
        progress: {
            availableDispatchQty,
            dispatchedQty,
            pendingDispatchQty,
            pendingProductionQty,
        },
    };
}
