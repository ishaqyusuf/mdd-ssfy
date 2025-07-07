"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { formatDate } from "@/lib/use-day";
import { whereSales } from "@/utils/db/where.sales";

export async function getCustomerPendingSales(accountNo) {
    const query: SearchParamsType = {
        invoice: "pending",
        "sales.type": "order",
    };
    const [p1, p2] = accountNo?.split("-");
    if (p1 == "cust") query["customer.id"] = Number(p2);
    else query["phone"] = accountNo;
    const where = whereSales(query);
    const ls = await prisma.salesOrders.findMany({
        where,
        select: {
            amountDue: true,
            orderId: true,
            id: true,
            grandTotal: true,
            createdAt: true,
        },
    });
    return ls;
}
