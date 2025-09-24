import { prisma, Prisma } from "@/db";
import { generateRandomString } from "@/lib/utils";

import { StepComponentForm, StepComponentMeta } from "../../types";
import { revalidatePath } from "next/cache";

export interface LoadStepComponentsProps {
    stepId?: number;
    stepTitle?: "Door" | "Moulding";
    id?;
    ids?;
    title?;
    isCustom?: boolean;
}

export async function getComponentsDta(props: LoadStepComponentsProps) {
    const wheres: Prisma.DykeStepProductsWhereInput[] = [];

    if (props.stepTitle == "Door")
        wheres.push({
            OR: [
                { door: { isNot: null }, deletedAt: {} },
                { dykeStepId: props.stepId },
            ],
        });
    else if (props.stepTitle == "Moulding") {
        wheres.push({
            OR: [
                {
                    product: {
                        category: {
                            title: props.stepTitle,
                        },
                    },
                },
                { dykeStepId: props.stepId },
            ],
        });
    } else {
        if (props.stepId)
            wheres.push({
                dykeStepId: props.stepId,
            });
    }
    if (props.isCustom) wheres.push({ custom: true });
    if (props.title)
        wheres.push({
            name: props.title,
        });
    if (props.id) wheres.push({ id: props.id });
    if (props.ids)
        wheres.push({
            id: {
                in: props.ids,
            },
        });
    const stepProducts = await prisma.dykeStepProducts.findMany({
        where:
            wheres.length == 1
                ? wheres[0]
                : {
                      AND: wheres,
                  },
        include: {
            door: props.stepTitle != null,
            product: true,
            sorts: true,
        },
    });
    return stepProducts.map((s) => ({
        ...s,
        meta: s.meta as any as StepComponentMeta,
    }));
}

export async function updateStepComponentDta(id, data) {
    return await prisma.dykeStepProducts.update({
        where: { id },
        data: {
            ...data,
        },
    });
}
export async function createStepComponentDta(data: StepComponentForm) {
    const meta = {} satisfies StepComponentMeta;
    const c = data.id
        ? await prisma.dykeStepProducts?.update({
              where: { id: data.id },
              data: {
                  img: data.img,
                  name: data.title,
                  productCode: data.productCode,
              },
          })
        : prisma.dykeStepProducts.create({
              data: {
                  uid: generateRandomString(5),
                  custom: data.custom,
                  productCode: data.productCode,
                  meta,
                  step: {
                      connect: { id: data.stepId },
                  },
                  img: data.img,
                  name: data.title,
              },
          });
    revalidatePath(`step-components-${data?.stepId}`);
    return c;
}
