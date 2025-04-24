"use server";

import { sum } from "@/lib/utils";

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
    return {
        id: overview.orderId,
        orderUid: overview.orderId,
        progress: {
            availableDispatchQty,
            dispatchedQty,
            pendingDispatchQty,
            pendingProductionQty,
        },
    };
}
