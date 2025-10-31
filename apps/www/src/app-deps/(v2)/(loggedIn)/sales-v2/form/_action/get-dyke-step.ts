"use server";

import { ComponentPrice, DykeStepForm, prisma } from "@/db";

import { DykeFormStepMeta, DykeStepMeta } from "../../type";

export async function getStepForm(id) {
    const step = await prisma.dykeSteps.findUnique({
        where: {
            id,
        },
        include: {
            stepProducts: {
                include: {
                    product: true,
                },
            },
        },
    });

    return {
        // step,
        step: {
            ...step,
            meta: (step.meta || {
                priceDepencies: {},
                stateDeps: {},
            }) as DykeStepMeta,
        },
        item: {
            stepId: id,
            meta: {},
        } as Omit<DykeStepForm, "meta"> & {
            meta: DykeFormStepMeta;
            priceData?: Partial<ComponentPrice>;
        },
    };
}
// export async function getStepProductsAction
