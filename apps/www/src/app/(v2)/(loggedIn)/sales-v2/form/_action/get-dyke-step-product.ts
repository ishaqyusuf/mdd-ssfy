"use server";

import { prisma } from "@/db";

import { findDoorSvg } from "../../_utils/find-door-svg";
import { sortStepProducts, transformStepProducts } from "../../dyke-utils";
import {
    DykeProductMeta,
    DykeStepItemMeta,
    DykeStepMeta,
    StepProdctMeta,
} from "../../type";

export async function getMouldingStepProduct(specie) {
    const stepProducts = await prisma.dykeStepProducts.findMany({
        where: {
            product: {
                category: {
                    title: "Moulding",
                },
            },
        },
        include: {
            product: true,
        },
    });
    const prods = stepProducts
        .filter((s) => {
            let meta = s.product.meta as any as DykeProductMeta;
            return meta?.mouldingSpecies?.[specie] || false;
        })
        .map(transformStepProducts);
    return sortStepProducts(prods);
}
export async function getSlabDoorTypes() {
    const p = await prisma.dykeProducts.findFirst({
        where: {
            title: "HC Molded",
        },
        include: {
            stepProducts: true,
        },
    });

    return await getStepProduct(p?.stepProducts?.[0]?.dykeStepId);
}
export async function getStepProduct(stepId, doorType?) {
    const stepProducts = await prisma.dykeStepProducts.findMany({
        where: {
            dykeStepId: stepId,
        },
        include: {
            product: true,
        },
    });
    let prods = stepProducts
        .filter(
            (_, i) =>
                stepProducts.findIndex(
                    (p) =>
                        p.dykeProductId == _.dykeProductId ||
                        p.product?.title == _.product?.title,
                ) == i,
        )
        .map(transformStepProducts);
    // prods[0].meta.
    let sorted = sortStepProducts(prods);
    return sorted;
}
