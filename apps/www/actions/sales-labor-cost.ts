"use server";

import { prisma } from "@/db";
import dayjs from "dayjs";
import { SiteEvent } from "./site-event-class";
import { revalidateTag, unstable_cache } from "next/cache";
import { actionClient } from "./safe-action";
import z from "zod";
import { saveSalesLaborCostSchema } from "./schema";

export async function getSalesLaborCost() {
    const tags = ["sales-labor-cost"];
    const fn = async () => {
        const cost = await prisma.salesLaborCosts.findFirst({
            where: {
                current: true,
            },
        });
        return cost;
    };
    // return await fn();
    return unstable_cache(fn, [tags], {
        tags,
    })();
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
        cost = await prisma.salesLaborCosts.update({
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
        cost = await prisma.salesLaborCosts.create({
            data: {
                rate,
                current: true,
            },
        });
        const ev = new SiteEvent();
        await ev.event("created").type("sales-labor-cost").create();
    }
    revalidateTag("sales-labor-cost");
    return cost?.rate;
}

export const saveSalesLaborCost = actionClient
    .schema(saveSalesLaborCostSchema)
    .metadata({
        name: "save-sales-labor-cost",
        track: {
            event: "sales-labor-cost",
            type: "save",
        },
    })
    .action(async ({ parsedInput: { rate } }) => {
        await updateSalesLaborCost(rate);
        return { success: true, rate };
    });
