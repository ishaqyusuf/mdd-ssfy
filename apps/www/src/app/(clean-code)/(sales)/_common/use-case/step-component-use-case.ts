"use server";

import { LabelValue } from "@/app/(clean-code)/type";
import { Prisma, prisma } from "@/db";
import { dtoStepComponent } from "@/utils/dto-step-component";

import { SalesFormZusData, StepComponentForm } from "../../types";
import {
    getDoorSizesDta,
    getDykeStepProductTitles,
    getDykeStepTitlesDta,
} from "../data-access/dyke-steps.persistent";
import {
    deleteStepProductsByUidDta,
    getComponentDta,
    getComponentMetaDta,
    getSalesFormStepByIdDta,
    getStepComponentsMetaByUidDta,
    updateStepComponentMetaDta,
    updateStepMetaDta,
} from "../data-access/sales-form-step-dta";
import {
    harvestSalesPricingDta,
    saveHarvestedDta,
} from "../data-access/sales-pricing-dta";
import {
    createStepComponentDta,
    getComponentsDta,
    loadStepComponentsDta,
    updateStepComponentDta,
} from "../data-access/step-components.dta";
import { updateComponentPricingUseCase } from "./sales-book-pricing-use-case";

export async function getMouldingSpeciesUseCase() {
    return await getDykeStepProductTitles("Specie");
}
export async function getDoorSizesUseCase(height) {
    return await getDoorSizesDta(height);
}
export async function getDykeStepTitlesOptionUseCase() {
    const resp = await getDykeStepTitlesDta();
    return resp.map(
        ({ id, title }) =>
            ({
                label: title,
                value: id,
            }) as LabelValue,
    );
}
export async function sortStepComponentsUseCase(components) {
    await Promise.all(
        components.map(async (c, index) => {
            const data = { sortIndex: index };
            await updateStepComponentDta(c.id, data);
        }),
    );
}
export async function getStepComponentsUseCase(stepTitle, stepId) {
    return await loadStepComponentsDta({ stepTitle, stepId });
}
interface GetNextStepProps {
    nextStepId;
    // currentStepTitle;
}
export async function getNextStepUseCase({
    nextStepId,
}: GetNextStepProps): Promise<SalesFormZusData["kvStepForm"][number]> {
    const step = await getSalesFormStepByIdDta(nextStepId);
    return {
        componentUid: null,
        title: step.step.title,
        value: "",
        // price: null,
        basePrice: null,
        salesPrice: null,
        stepFormId: null,
        stepId: step.step.id,
        meta: step.step.meta as any,
    };
}
export async function deleteStepComponentsUseCase(uids: string[]) {
    return await deleteStepProductsByUidDta(uids);
}
export async function saveComponentVariantUseCase(uids, variants) {
    const products = await getStepComponentsMetaByUidDta(uids);
    await Promise.all(
        products.map(async (product) => {
            if (!product.meta) product.meta = {};
            product.meta.variations = variants;
            const resp = await updateStepComponentMetaDta(
                product.id,
                product.meta,
            );
        }),
    );
    return {
        variants,
        uids,
    };
}
export async function updateSectionOverrideUseCase(id, sectionOverride) {
    let meta = await getComponentMetaDta(id);
    if (!meta) meta = {};
    meta.sectionOverride = sectionOverride;
    await updateStepComponentMetaDta(id, meta);
}
// export async function saveDoorSizeVariants
export async function updateStepMetaUseCase(id, meta) {
    return await updateStepMetaDta(id, meta);
}
export async function harvestDoorPricingUseCase() {
    const val = await harvestSalesPricingDta();
    return val;
}
export async function saveHarvestedDoorPricingUseCase(ls) {
    const val = await saveHarvestedDta(ls);
    return val;
}
export async function saveComponentRedirectUidUseCase(id, redirectUid) {
    await updateStepComponentDta(id, { redirectUid });
}
export async function createComponentUseCase(data: StepComponentForm) {
    const c = await createStepComponentDta(data);
    const resp = dtoStepComponent(c);
    return resp;
}
export async function updateCustomComponentUseCase(data: {
    price: number;
    id: number;
}) {
    await updateComponentPricingUseCase([
        {
            id: data.id,
            price: data.price,
        },
    ]);
    const c = (
        await getComponentsDta({
            isCustom: true,
            id: data.id,
        })
    )[0];
    const resp = dtoStepComponent(c);
    return resp;
}
export async function createCustomComponentUseCase(data: {
    title: string;
    stepId: number;
    price: number | null;
}) {
    const component = await createStepComponentDta({
        stepId: data.stepId,
        title: data.title,
        custom: true,
    });
    if (data.price)
        await updateComponentPricingUseCase([
            {
                id: component.id,
                price: data.price,
            },
        ]);
    return dtoStepComponent(component);
}
interface BrowseComponentImgProps {
    q: string;
    stepId: number;
    page?: number;
    perPage?: number;
}
export async function browseComponentImgUseCase({
    q,
    stepId,
    perPage = 20,
    page = 1,
}: BrowseComponentImgProps) {
    const imgNotNull = { img: { not: null } };
    const query: Prisma.DykeStepProductsWhereInput[] = [
        {
            deletedAt: {},
            OR: [
                imgNotNull,
                {
                    door: imgNotNull,
                },
                {
                    product: imgNotNull,
                },
            ],
        },
    ];
    if (q) {
        const _q = { contains: q };
        query.push({
            OR: [
                {
                    door: {
                        title: _q,
                    },
                },
                {
                    product: {
                        title: _q,
                    },
                },
                {
                    name: _q,
                },
            ],
        });
    }
    if (stepId) {
        query.push({
            dykeStepId: stepId,
        });
    }
    const result = await prisma.dykeStepProducts.findMany({
        where: {
            AND: query,
        },
        select: {
            img: true,
            name: true,
            door: {
                select: {
                    img: true,
                    title: true,
                },
            },
            product: {
                select: {
                    img: true,
                    title: true,
                },
            },
        },
        // distinct: "img",
        take: 20,
    });
    return result.map((result) => {
        return {
            title: result.name || result.door?.title || result.product?.title,
            img: result.img || result.door?.img || result.product?.img,
        };
    });
}
