"use server";

import { SalesMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";

export async function updateSalesLaborCostAction(id, value) {
    const s = await prisma.salesOrders.findFirstOrThrow({
        where: {
            id,
        },
        select: {
            meta: true,
            grandTotal: true,
            amountDue: true,
        },
    });
    let meta = s.meta as any as SalesMeta;
    const oldCost = Number(meta.labor_cost);
    const newCost = Number(value);
    let amountDue = Number(s.amountDue);
    let grandTotal = sum([s.grandTotal, -1 * oldCost, newCost]);
    const costDiff = sum([oldCost, -1 * newCost]);
    //if costDiff is negative: add costDiff to amountDue;
    if (costDiff < 0) {
        amountDue += -1 * costDiff;
    } else {
        //if costDiff is positive: subtract costDiff from amountDue;
        amountDue -= costDiff;
    }
    if (amountDue < 0) {
        //
        // await
        // TODO: REFUND CUSTOMER WALLET
    }
    meta.labor_cost = newCost;
    await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            grandTotal,
            amountDue,
            meta: meta as any,
        },
    });
}
