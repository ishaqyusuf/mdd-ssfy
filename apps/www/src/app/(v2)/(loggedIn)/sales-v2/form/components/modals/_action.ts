"use server";

import { prisma } from "@/db";

export async function _getMouldingSpecies() {
    const species = await prisma.dykeSteps.findFirst({
        where: {
            title: "Specie",
        },
        include: {
            stepProducts: {
                include: {
                    product: true,
                },
            },
        },
    });
    return species?.stepProducts.map((p) => p.product.title).filter(Boolean);
}
