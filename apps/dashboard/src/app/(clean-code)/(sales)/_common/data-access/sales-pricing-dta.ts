import { AsyncFnType } from "@/app-deps/(clean-code)/type";
import { prisma, Prisma } from "@/db";

import { DykeProductMeta } from "../../types";
import { queueDykeStepToInventorySync } from "@gnd/inventory";
import { saveLegacyComponentPricings, saveLegacyHarvestedPricings, updateLegacyComponentPricings } from "@gnd/db/queries";

export type GetPricingList = AsyncFnType<typeof getPricingListDta>;
export async function getPricingListDta(
    where: Prisma.DykePricingSystemWhereInput = {}
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
    data: Partial<Prisma.DykePricingSystemCreateManyInput>[]
) {
    const stepIds = await updateLegacyComponentPricings(prisma, data);
    await Promise.all(
        stepIds.map((stepId) =>
            queueDykeStepToInventorySync({
                stepId,
                source: "event",
            }),
        ),
    );
}
export async function saveComponentPricingsDta(
    data: Prisma.DykePricingSystemCreateManyInput[]
) {
    const stepIds = await saveLegacyComponentPricings(prisma, data);
    await Promise.all(
        stepIds.map((stepId) =>
            queueDykeStepToInventorySync({
                stepId,
                source: "event",
            }),
        ),
    );
    return {
        status: "success",
    };
}
export async function saveHarvestedDta(ls: Prisma.DykePricingSystemCreateManyInput[]) {
    const result = await saveLegacyHarvestedPricings(prisma, ls);
    const stepIds = Array.from(
        new Set(ls.map((item) => Number(item.dykeStepId || 0))),
    ).filter(Boolean);
    await Promise.all(
        stepIds.map((stepId) =>
            queueDykeStepToInventorySync({
                stepId,
                source: "event",
            }),
        ),
    );
    return result;
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
