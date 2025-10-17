"use server";

import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { prisma } from "@/db";
import dayjs from "dayjs";

export async function _updateSalesDate(
    id,
    date,
    orderId,
    page: "invoice" | "overview" = "invoice"
) {
    const d = dayjs(date);
    const slug = [d.format("YY"), d.format("MMDD"), id].join("-");
    const sales = await prisma.salesOrders.update({
        where: { id },
        data: {
            // slug,
            // orderId: slug,
            createdAt: new Date(date),
            updatedAt: new Date(date),
        },
    });

    _revalidate(`${page}-${sales.type}` as any);
}
