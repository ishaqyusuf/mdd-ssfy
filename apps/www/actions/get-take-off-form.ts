"use server";

import { getSalesItemOverviewDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { getSalesItemsOverviewAction } from "@/app/(clean-code)/(sales)/_common/data-actions/sales-items-action";

export async function getTakeOffForm(id) {
    const data = await getSalesItemsOverviewAction({
        salesId: id,
    });
    const meta = data.meta;
    const takeOff = meta.takeOff;
    data.items.map((item) => {
        const itemControlUid = item.itemControlUid;
        const qty = item.status.qty;
    });
    return {
        takeOff,
        items: data.items,
    };
}
