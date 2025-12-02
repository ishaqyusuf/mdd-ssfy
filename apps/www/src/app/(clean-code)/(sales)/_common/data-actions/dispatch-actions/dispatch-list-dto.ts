import { toSafeInteger } from "lodash";

import { sum } from "@/lib/utils";
import { formatDate } from "@/lib/use-day";
import { SalesDispatchStatus } from "@/app-deps/(clean-code)/(sales)/types";
import { generateDispatchId } from "@/app-deps/(clean-code)/(sales)/_common/utils/dispatch-utils";
import { LoadDispatchListAction } from "@/app-deps/(clean-code)/(sales)/_common/data-actions/dispatch-actions/dispatch-list-action";
export type DispatchItem = LoadDispatchListAction[number]["items"][number];

export function transformDispatchList(dispatch: LoadDispatchListAction[0]) {
    const items = dispatch.items.map(transformDispatchListItem);
    let qty = {
        lh: 0,
        rh: 0,
        qty: 0,
        total: 0,
    };
    items.map((i) => {
        qty.total += toSafeInteger(i.total);
        qty.lh += toSafeInteger(i.lh);
        qty.rh += toSafeInteger(i.rh);
        qty.qty += toSafeInteger(i.qty);
    });

    return {
        id: dispatch.id,
        uid: generateDispatchId(dispatch.id),
        items,
        status: dispatch.status as SalesDispatchStatus,
        deliveryMode: dispatch.deliveryMode as "pickup" | "delivery",
        assignedTo: {
            id: dispatch.driver?.id,
            name: dispatch.driver?.name,
        },
        author: {
            id: dispatch.createdBy?.id,
            name: dispatch?.createdBy?.name,
        },
        totalQty: qty.total,
        createdAt: dispatch.createdAt,
        order: dispatch.order,
        date: formatDate(dispatch.createdAt),
    };
}
export type TransformedDispatchListItem = ReturnType<
    typeof transformDispatchList
>;
export function transformDispatchListItem(item: DispatchItem) {
    const {
        lhQty,
        rhQty,
        qty,
        salesItem: { description, housePackageTool } = {},
        submission: { assignment: { salesDoor } = {} } = {},
    } = item;
    const { dimension, swing } = salesDoor || {};
    const stepProduct = housePackageTool?.stepProduct;
    const productName = stepProduct?.name;
    return {
        lh: lhQty,
        rh: rhQty,
        qty,
        total: lhQty || rhQty ? sum([lhQty, rhQty]) : qty,
        itemTitle: dimension
            ? `${productName} - ${dimension}`
            : productName || description,
    };
}
