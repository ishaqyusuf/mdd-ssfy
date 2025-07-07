"use server";

import { itemControlUidObject } from "@/app/(clean-code)/(sales)/_common/utils/item-control-utils";

export async function updateItemLaborCost(itemUid, cost, qty) {
    const d = itemControlUidObject(itemUid);
}
