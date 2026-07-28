import { AsyncFnType } from "@/app/(clean-code)/type";
import { prisma, Prisma } from "@/db";

import { DykeProductMeta } from "../../types";
import { queueDykeStepToInventorySync } from "@gnd/inventory";

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
    const inputStepIds = data
        .map((item) => Number(item.dykeStepId || 0))
        .filter(Boolean);
    const pricingIds = data.map((item) => Number(item.id || 0)).filter(Boolean);
    const existingPricings = pricingIds.length
        ? await prisma.dykePricingSystem.findMany({
              where: {
                  id: {
                      in: pricingIds,
                  },
              },
              select: {
                  dykeStepId: true,
              },
          })
        : [];
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
    const stepIds = Array.from(
        new Set([
            ...inputStepIds,
            ...existingPricings.map((pricing) => pricing.dykeStepId),
        ]),
    ).filter(Boolean);
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
    const stepIds = Array.from(
        new Set(newData.map((item) => Number(item.dykeStepId || 0))),
    ).filter(Boolean);
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
export async function saveHarvestedDta(ls) {
    const result = await prisma.dykePricingSystem.createMany({
        data: ls,
    });
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
