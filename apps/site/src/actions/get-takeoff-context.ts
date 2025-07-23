"use server";

import { unstable_cache } from "next/cache";
import { loadSalesSetting } from "./sales-settings";
import { prisma } from "@/db";
import { TakeOffTemplateData } from "@/types/sales";
import { Tags } from "@/utils/constants";
import { StepComponentMeta } from "@/app/(clean-code)/(sales)/types";

export async function getTakeOffContext() {
    const settings = await loadSalesSetting();
    const templates = await getTakeOffTemplates();
    const components = await getRootStepComponents(
        Object.keys(settings.data.route),
    );
    const sections = Object.entries(settings.data.route)
        .map(([k, v]) => {
            const component = components.find((s) => s.uid == k);
            return {
                title:
                    component.product?.description ||
                    component.product?.title ||
                    component.name,
                img: component.img || component?.product?.img,
                templates: templates.filter((t) => t.sectionUid == k),
                routeSequence: (v as any).routeSequence,
                // routeUid: k,
                componentUid: component?.uid,
                stepUid: component.step?.uid,
                componentId: component.id,
                stepId: component.step.id,
            };
        })
        .filter((a) =>
            [
                // "moulding",
                // "shelf items",
                // "services",
            ].every((t) => a.title?.toLocaleLowerCase() != t),
        );
    return {
        sections,
    };
}
export async function getRootStepComponents(uids) {
    const tags = [Tags.rootStepComponents];
    return unstable_cache(
        async () => {
            const components = await prisma.dykeStepProducts.findMany({
                where: {
                    uid: {
                        in: uids,
                    },
                },
                select: {
                    meta: true,
                    img: true,
                    uid: true,
                    name: true,
                    id: true,
                    step: {
                        select: {
                            uid: true,
                            id: true,
                        },
                    },
                    product: {
                        select: {
                            title: true,
                            description: true,
                            img: true,
                        },
                    },
                },
            });
            return components.map((a) => ({
                ...a,
                meta: a.meta as StepComponentMeta,
            }));
        },
        tags,
        { tags },
    )();
}
async function getTakeOffTemplates() {
    const tags = [Tags.takeOffTemplates];
    return unstable_cache(
        async () => {
            const templates = await prisma.salesTakeOffTemplates.findMany({});
            return templates.map((d) => {
                return {
                    ...d,
                    data: d.data as any as TakeOffTemplateData,
                };
            });
        },
        tags,
        {
            tags,
        },
    )();
}
