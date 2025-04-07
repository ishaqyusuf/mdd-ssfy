import { AsyncFnType } from "@/app/(clean-code)/type";
import { DykeStepMeta } from "@/app/(v2)/(loggedIn)/sales-v2/type";
import { ComponentPrice, DykeStepForm, prisma, Prisma } from "@/db";

import { DykeFormStepMeta, StepComponentMeta, StepMeta } from "../../types";
import { notDeleted } from "../utils/db-utils";

export type GetStepDta = AsyncFnType<typeof getStepDta>;
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
export async function getStepDta(dyekStepId) {
    const step = await prisma.dykeSteps.findUnique({
        where: {
            id: dyekStepId,
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
        title: step?.title,
        value: null,
        stepId: step?.id,
        stepFormId: null,
        stepUid: step.uid,
    };
}

interface ValidateNextStepIdProps {
    nextStepId;
}
export async function validateNextStepIdDta({}: ValidateNextStepIdProps) {}
export type GetStepsForRoutingProps = AsyncFnType<typeof getStepsForRoutingDta>;
export async function getStepsForRoutingDta() {
    // await fixStepsDta();
    // return [];
    const steps = await prisma.dykeSteps.findMany({
        select: {
            id: true,
            uid: true,
            title: true,
            stepValueId: true,
            prevStepValueId: true,
            rootStepValueId: true,
            meta: true,
            stepProducts: {
                where: notDeleted.where,
                select: {
                    // nextStepId: true,
                    redirectUid: true,
                    nextStepId: true,
                    dykeStepId: true,
                    uid: true,
                    id: true,
                    custom: true,
                    meta: true,
                    name: true,
                    product: {
                        select: {
                            title: true,
                            value: true,
                            img: true,
                        },
                    },
                    door: {
                        select: {
                            title: true,
                            img: true,
                        },
                    },
                },
            },
        },
    });
    return steps
        .filter((d, i) => {
            const f1 = steps.findIndex((a) => a.title == d.title) == i;
            if (d.title == "Door Type") return d.id == 41;
            return f1;
        })
        .filter((a) => a.title)
        .filter((a) => !a.title.includes("--"))
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((data) => {
            return {
                ...data,
                meta: data.meta as any as StepMeta,
                stepProducts: data.stepProducts?.map((prod) => {
                    return {
                        ...prod,
                        meta: (prod.meta || {}) as StepComponentMeta,
                    };
                }),
            };
        });
}
export async function fixStepsDta() {
    const stepprod = await prisma.dykeSteps.findMany({
        where: {
            stepProducts: {
                some: {
                    product: {
                        title: "Wood Stile & Rail",
                    },
                },
            },
        },
        include: {
            stepProducts: {
                where: {
                    product: {
                        title: "Wood Stile & Rail",
                    },
                },
                include: {
                    product: true,
                },
            },
        },
    });
    const species = await prisma.dykeSteps.findFirst({
        where: {
            title: "Door Species",
        },
    });
    // console.log(species);
    await prisma.dykeStepProducts.updateMany({
        where: {
            id: {
                in: stepprod
                    .map((s) => s.stepProducts.map((s) => s.id).flat())
                    .flat(),
            },
        },
        data: {
            nextStepId: species.id,
        },
    });
}
export async function deleteStepProductsByUidDta(uids: string[]) {
    await prisma.dykeStepProducts.updateMany({
        where: {
            uid: {
                in: uids,
            },
        },
        data: {
            deletedAt: new Date(),
        },
    });
}
export async function getComponentDta(id) {
    return await prisma.dykeStepProducts.findUniqueOrThrow({
        where: { id },
    });
}
export async function getComponentMetaDta(id) {
    return (await getComponentDta(id))?.meta as any as StepComponentMeta;
}
export async function getStepComponentsMetaByUidDta(uids: string[]) {
    return (
        await prisma.dykeStepProducts.findMany({
            where: {
                uid: { in: uids },
            },
            select: {
                id: true,
                meta: true,
            },
        })
    ).map(({ id, meta }) => ({ id, meta: meta as StepComponentMeta }));
}
export async function updateStepComponentMetaDta(id, meta) {
    const data = await prisma.dykeStepProducts.update({
        where: { id },
        data: { meta },
    });
}
export async function updateStepMetaDta(id, meta) {
    const data = await prisma.dykeSteps.update({
        where: { id },
        data: { meta },
    });
    return data;
}
