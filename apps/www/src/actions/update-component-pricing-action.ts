"use server";

import { prisma } from "@/db";

import { actionClient } from "./safe-action";
import { updateComponentPricingSchema } from "./schema";
import { invalidateSalesWorkflowForStepComponent } from "@api/db/queries/sales-form";
import { queueDykeStepToInventorySync } from "@gnd/inventory";

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
            await prisma.dykePricingSystem.createMany({
                data: newData.map((d) => ({
                    ...d,
                    price: d.price,
                    dykeStepId: input.stepId,
                    stepProductUid: input.stepProductUid,
                })),
            });
        }
        await invalidateSalesWorkflowForStepComponent({
            stepId: input.stepId,
            componentUid: input.stepProductUid,
        });
        await queueDykeStepToInventorySync({
            stepId: input.stepId,
            source: "event",
        });
    });
