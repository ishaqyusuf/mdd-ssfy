import { StepComponentMeta } from "@/app/(clean-code)/(sales)/types";
import { Prisma, prisma } from "@/db";
import { unstable_cache } from "next/cache";

export async function getStepComponents(stepId, stepTitle) {
    return unstable_cache(
        async (stepId, stepTitle) => {
            const wheres: Prisma.DykeStepProductsWhereInput[] = [];

            if (stepTitle == "Door")
                wheres.push({
                    OR: [
                        { door: { isNot: null }, deletedAt: {} },
                        { dykeStepId: stepId },
                    ],
                });
            else if (stepTitle == "Moulding") {
                wheres.push({
                    OR: [
                        {
                            product: {
                                category: {
                                    title: stepTitle,
                                },
                            },
                        },
                        { dykeStepId: stepId },
                    ],
                });
            } else {
                wheres.push({
                    dykeStepId: stepId,
                });
            }
            const stepProducts = await prisma.dykeStepProducts.findMany({
                where:
                    wheres.length == 1
                        ? wheres[0]
                        : {
                              AND: wheres,
                          },
                include: {
                    door: stepTitle != null,
                    product: true,
                    sorts: true,
                },
            });
            return stepProducts.map(dtoStepComponent);
        },
        [`step-components-${stepId}`],
        {
            tags: [`step-components-${stepId}`],
        },
    )(stepId, stepTitle);
}
export function dtoStepComponent(data) {
    let { door, product, sortIndex, sorts, ...component } =
        data as Prisma.DykeStepProductsGetPayload<{
            include: {
                door: true;
                product: true;
                sorts: true;
            };
        }>;
    let meta: StepComponentMeta = component.meta as any;
    return {
        uid: component.uid,
        sortIndex,
        id: component.id,
        title: component.name || door?.title || product?.title,
        img: component.img || product?.img || door?.img,
        productId: product?.id || door?.id,
        variations: meta?.variations || [],
        sectionOverride: meta?.sectionOverride,
        salesPrice: null,
        basePrice: null,
        stepId: component.dykeStepId,
        productCode: component.productCode,
        redirectUid: component.redirectUid,
        _metaData: {
            sorts: (sorts || [])?.map(
                ({ sortIndex, stepComponentId, uid }) => ({
                    sortIndex,
                    stepComponentId,
                    uid,
                }),
            ),
            custom: component.custom,
            visible: false,
            priceId: null,
            sortId: null,
            sortIndex: null,
            sortUid: null,
        },
        isDeleted: !!component.deletedAt,
    };
}
