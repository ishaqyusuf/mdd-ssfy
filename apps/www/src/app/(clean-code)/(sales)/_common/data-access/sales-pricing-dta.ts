import { AsyncFnType } from "@/app/(clean-code)/type";
import { prisma, Prisma } from "@/db";

import { DykeProductMeta } from "../../types";

export type GetPricingList = AsyncFnType<typeof getPricingListDta>;
export async function getPricingListDta(
    where: Prisma.DykePricingSystemWhereInput = {},
) {
    const pricings = await prisma.dykePricingSystem.findMany({
        where,
        select: {
            id: true,
            dependenciesUid: true,
            price: true,
            stepProductUid: true,
        },
    });
    return pricings;
}
export async function getComponentPricingListByUidDta(stepProductUid) {
    return await getPricingListDta({
        stepProductUid,
    });
}
export async function updateComponentPricingsDta(
    data: Partial<Prisma.DykePricingSystemCreateManyInput>[],
) {
    const updateByPrice: { [price in string]: number[] } = {};
    const deleteIds = [];
    data.map((p) => {
        const k = p.price;
        if (!k) deleteIds.push(p.id);
        if (updateByPrice[k]) updateByPrice[k].push(p.id);
        else updateByPrice[k] = [p.id];
    });
    await Promise.all(
        Object.entries(updateByPrice).map(async ([price, ids]) => {
            await prisma.dykePricingSystem.updateMany({
                where: { id: { in: ids } },
                data: {
                    price: price == "del" ? null : Number(price),
                },
            });
        }),
    );
    if (deleteIds.length)
        await prisma.dykePricingSystem.updateMany({
            where: { id: { in: deleteIds } },
            data: {
                deletedAt: new Date(),
            },
        });
}
export async function saveComponentPricingsDta(
    data: Prisma.DykePricingSystemCreateManyInput[],
) {
    const newData = data
        .filter((a) => !a.id && a.price)
        .map(({ id, ...rest }) => rest);

    if (newData.length) {
        const resp = await prisma.dykePricingSystem.createMany({
            data: newData,
        });
    }
    await updateComponentPricingsDta(data.filter((d) => d.id));
    return {
        status: "success",
    };
}
export async function saveHarvestedDta(ls) {
    return await prisma.dykePricingSystem.createMany({
        data: ls,
    });
}
export async function harvestSalesPricingDta() {
    const steps = await prisma.dykeStepProducts.findMany({
        where: {
            door: {
                deletedAt: null,
            },
        },
        select: {
            uid: true,
            dykeStepId: true,
            door: {
                select: {
                    meta: true,
                },
            },
        },
    });
    const res = steps
        .map((s) => {
            return {
                uid: s.uid,
                stepId: s.dykeStepId,
                doorPrice: (s?.door?.meta as any as DykeProductMeta)?.doorPrice,
            };
        })
        .filter((s) => s.doorPrice);
    const inserts: Prisma.DykePricingSystemCreateManyInput[] = [];
    res.map((r) => {
        Object.entries(r.doorPrice).map(([dependenciesUid, price]) => {
            if (price)
                inserts.push({
                    price,
                    dependenciesUid,
                    dykeStepId: r.stepId,
                    stepProductUid: r.uid,
                });
        });
    });
    return inserts;
}
