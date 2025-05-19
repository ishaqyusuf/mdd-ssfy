"use server";

import { prisma } from "@/db";
import { IStepProducts } from ".";

export async function getStepPricings(dependenciesUid, dykeStepId) {
    const pricesByUid = {};
    const prices = (
        await prisma.dykePricingSystem.findMany({
            where: {
                dependenciesUid,
                dykeStepId,
            },
        })
    ).map(({ id, stepProductUid, price }) => {
        pricesByUid[stepProductUid] = price;
        return { stepProductUid, id, price };
    });

    return {
        prices,
        pricesByUid,
    };
}
