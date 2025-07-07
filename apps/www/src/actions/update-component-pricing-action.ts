"use server";

import { prisma } from "@/db";

import { actionClient } from "./safe-action";
import { stepComponentSchema, updateComponentPricingSchema } from "./schema";

export const updateComponentPricingAction = actionClient
    .schema(updateComponentPricingSchema)
    .metadata({
        name: "update-component-pricing",
    })
    .action(async ({ parsedInput: { ...input } }) => {
        const updateByPrice: { [price in string]: number[] } = {};
        const deleteIds = [];
        input.pricings
            .filter((a) => a.id)
            .map((p) => {
                //
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
        const newData = input.pricings
            .filter((a) => !a.id && a.price)
            .map(({ id, ...rest }) => rest);

        if (newData.length) {
            const resp = await prisma.dykePricingSystem.createMany({
                data: newData.map((d) => ({
                    ...d,
                    price: d.price,
                    dykeStepId: input.stepId,
                    stepProductUid: input.stepProductUid,
                })),
            });
        }
    });
