"use server";

import { prisma } from "@/db";
import dayjs from "dayjs";
import { SiteEvent } from "./site-event-class";

export async function getSalesLaborCost() {
    const cost = await prisma.salesLaborCosts.findFirst({
        where: {
            current: true,
        },
    });
    return cost;
}

export async function updateSalesLaborCost(rate) {
    let cost = await getSalesLaborCost();
    if (cost && dayjs().diff(cost.createdAt, "days") > 30) {
        await prisma.salesLaborCosts.updateMany({
            data: {
                current: false,
            },
        });
        cost = null;
    }
    if (cost) {
        await prisma.salesLaborCosts.update({
            where: {
                id: cost.id,
            },
            data: {
                rate,
            },
        });
        const ev = new SiteEvent();
        await ev.event("edited").type("sales-labor-cost").create();
    } else {
        await prisma.salesLaborCosts.create({
            data: {
                rate,
                current: true,
            },
        });
        const ev = new SiteEvent();
        await ev.event("created").type("sales-labor-cost").create();
    }
}
