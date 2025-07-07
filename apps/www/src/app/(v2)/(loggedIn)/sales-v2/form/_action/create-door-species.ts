"use server";

import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { DykeStepProducts, DykeSteps, prisma } from "@/db";
import { lastId } from "@/lib/nextId";
import { uploadFile } from "@/lib/upload-file";
import { generateRandomString } from "@/lib/utils";

export async function createDoorSpecies(
    step: DykeSteps,
    stepProduct: DykeStepProducts,
) {
    const stepId = (
        await prisma.dykeSteps.findFirst({
            where: {
                title: "Door Species",
                value: {
                    contains: "Interior",
                },
            },
        })
    )?.id;
    if (stepId) return stepId;
    let lastProdId = await lastId(prisma.dykeProducts);
    const items = [
        {
            id: ++lastProdId,
            title: "Pine",
            url: "https://s3.us-east-2.amazonaws.com/dyke-site-assets/resources/doorparts/99a2c0454915001673638503.png",
        },
        {
            id: ++lastProdId,
            title: "Prime",
            url: "https://s3.us-east-2.amazonaws.com/dyke-site-assets/resources/doorparts/d30290663193001678217204.jpg",
        },
    ];
    await prisma.dykeProducts.createMany({
        data: await Promise.all(
            items.map(async (item) => {
                const u = await uploadFile(item.url, "dyke");
                return {
                    id: item.id,
                    img: u.secure_url.split("dyke/")[1],
                    value: item.title,
                    title: item.title,
                };
            }),
        ),
    });
    const s =
        (await prisma.dykeStepValues.findFirst({
            where: {
                title: "Door Species",
            },
        })) ||
        (await prisma.dykeStepValues.create({
            data: {
                title: "Door Species",
            },
        }));
    const ns = await prisma.dykeSteps.create({
        data: {
            title: "Door Species",
            value: step.value,
            prevStepValueId: step.stepValueId,
            rootStepValueId: step.rootStepValueId,
            stepValueId: s.id,
            uid: generateRandomString(5),
            stepProducts: {
                createMany: {
                    data: items.map((item) => ({
                        nextStepId: stepProduct.nextStepId,
                        dykeProductId: item.id,
                    })),
                },
            },
        },
    });
    _revalidate("salesV2Form");
    return ns.id;
}
