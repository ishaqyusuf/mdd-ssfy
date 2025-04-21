import { StepComponentMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma, Prisma } from "@/db";

// import { Prisma } from "@prisma/client";

// async function stepFn() {
//     return await prisma.door
// }
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
