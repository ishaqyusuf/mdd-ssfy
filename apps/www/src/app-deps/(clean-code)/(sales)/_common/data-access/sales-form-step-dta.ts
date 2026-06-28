import { ComponentPrice, DykeStepForm, prisma } from "@/db";

import { DykeFormStepMeta } from "../../types";
import { notDeleted } from "../utils/db-utils";
 
export async function getSalesFormStepByIdDta(id) {
    const step = await prisma.dykeSteps.findUnique({
        where: {
            id,
        },
        include: {
            stepProducts: {
                where: notDeleted.where,
                include: {
                    product: true,
                },
            },
        },
    });

    return {
        step: {
            ...step,
            meta: (step.meta || {
                priceDepencies: {},
                stateDeps: {},
            }) as any,
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
