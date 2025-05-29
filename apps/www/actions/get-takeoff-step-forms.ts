"use server";

import {
    SalesFormFields,
    StepComponentMeta,
    StepMeta,
} from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { TakeOffTemplateData } from "@/types/sales";

interface Props {
    configs: TakeOffTemplateData["formSteps"];
    itemUid: string;
}

export async function getTakeOffStepForms({ configs, itemUid }: Props) {
    const stepIds = configs.map((a) => a.stepId).filter(Boolean);
    let steps = (
        await prisma.dykeSteps.findMany({
            where: {
                OR: [
                    {
                        uid: {
                            in: configs.map((a) => a.stepUid)?.filter(Boolean),
                        },
                    },
                    {
                        id: {
                            in: stepIds,
                        },
                    },
                ],
            },
            select: {
                id: true,
                uid: true,
                meta: true,
                title: true,
            },
        })
    ).map((a) => ({
        ...a,
        meta: a.meta as StepMeta,
    }));
    steps = steps.filter(
        (a, i) =>
            i ==
            steps.findIndex(
                (e) => e.title?.toLowerCase() === a?.title?.toLowerCase(),
            ),
    );
    const components = (
        await prisma.dykeStepProducts.findMany({
            where: {
                OR: [
                    {
                        uid: {
                            in: configs
                                .map((a) => a.componentUid)
                                .filter(Boolean),
                        },
                    },
                    {
                        id: {
                            in: configs
                                .map((a) => a.componentId)
                                .filter(Boolean),
                        },
                    },
                ],
            },
            select: {
                name: true,
                img: true,
                uid: true,
                id: true,
                meta: true,
                product: {
                    select: {
                        title: true,
                        img: true,
                    },
                },
            },
        })
    ).map((a) => ({
        ...a,
        meta: a.meta as StepComponentMeta,
    }));
    return configs.map((c) => {
        const step = steps.find((s) => s.uid == c.stepUid || s.id == c.stepId);
        const component = components.find(
            (s) => s.uid == c.componentUid || s.id == c.componentId,
        );
        return {
            stepFormUid: `${itemUid}-${step.uid}`,
            stepForm: {
                componentUid: component?.uid,
                componentId: component?.id,
                title: step?.title,
                value: component?.name || component?.product?.title,
                meta: step.meta,
                stepId: step.id,
            } satisfies SalesFormFields["kvStepForm"][number],
        };
    });
}
