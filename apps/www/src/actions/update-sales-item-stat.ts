"use server";

import { QtyControlType } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { percent, sum } from "@/lib/utils";
import { Qty } from "@/utils/sales-control-util";

interface Props {
    uid: string;
    salesId: number;
    type: QtyControlType;
    qty: Qty;
    itemTotal?: number;
}
export async function updateSalesItemStats(
    data: Props,
    tx: typeof prisma, //= prisma,
) {
    const qtyControl = await tx.qtyControl.upsert({
        where: {
            itemControlUid_type: {
                itemControlUid: data.uid,
                type: data.type,
            },
        },
        create: {
            type: data.type,
            itemControlUid: data.uid,
            itemTotal: data.itemTotal,
        },
        update: {},
    });
    let { lh, rh, qty, percentage, itemTotal } = qtyControl;
    lh = sum([lh, data.qty.lh]);
    rh = sum([rh, data.qty.rh]);
    if (!data.qty.qty) data.qty.qty = sum([data.qty.lh, data.qty.rh]);
    qty = sum([qty, data.qty.qty]);
    percentage = percent(qty, itemTotal);
    await tx.qtyControl.update({
        where: {
            itemControlUid_type: {
                itemControlUid: data.uid,
                type: data.type,
            },
        },
        data: {
            rh,
            lh,
            percentage,
            qty,
        },
    });
}
