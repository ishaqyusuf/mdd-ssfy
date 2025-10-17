"use server";

import { prisma } from "@/db";
import { nextId } from "@/lib/nextId";
import dayjs from "dayjs";

export async function generateSalesIdDac(sales) {
    let { slug, orderId } = sales;
    const now = dayjs();
    if (!orderId)
        slug = orderId = [
            now.format("YY"),
            now.format("MMDD"),
            await nextId(prisma.salesOrders),
        ].join("-");
    else slug = orderId;

    return { slug, orderId };
}
