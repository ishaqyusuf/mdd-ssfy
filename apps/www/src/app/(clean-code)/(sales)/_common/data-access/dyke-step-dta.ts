import { prisma } from "@/db";
import { generateRandomString } from "@/lib/utils";

// export async function getCustomStepProductForm
export async function createCustomStepProductDta({
    title,
    price,
    dykeStepId,
    dependenciesUid,
}) {
    let prod = await findCustomStepProductDta(title);
    if (!prod) {
        prod = await prisma.dykeStepProducts.create({
            data: {
                uid: generateRandomString(5),
                custom: true,
                step: {
                    connect: {
                        id: dykeStepId,
                    },
                },
                product: {
                    create: {
                        title,
                        value: title,
                        custom: true,
                        productCode: generateRandomString(5),
                    },
                },
            },
            include: {
                product: true,
            },
        });
    }
    let pricing = await getPricingDta(prod.uid, dependenciesUid);
    if (pricing?.id && pricing.price == price) {
    } else {
        await deletePricingDta(pricing?.id);
        pricing = await createPricingDta(
            prod.uid,
            dependenciesUid,
            price,
            dykeStepId
        );
    }
    return {
        pricing,
        prod,
    };
}
export async function getPricingDta(stepProductUid, dependenciesUid) {
    return await prisma.dykePricingSystem.findFirst({
        where: {
            stepProductUid,
            dependenciesUid,
        },
    });
}
export async function createPricingDta(
    stepProductUid,
    dependenciesUid,
    price,
    stepId
) {
    return await prisma.dykePricingSystem.create({
        data: {
            stepProductUid,
            dependenciesUid,
            price,
            step: {
                connect: {
                    id: stepId,
                },
            },
        },
    });
}
export async function deletePricingDta(id) {
    if (!id) return;
    await prisma.dykePricingSystem.updateMany({
        where: {
            id,
        },
        data: {
            deletedAt: new Date(),
        },
    });
}
export async function findCustomStepProductDta(title) {
    const stepProd = await prisma.dykeStepProducts.findFirst({
        where: {
            custom: true,
            product: {
                title,
            },
        },
        include: {
            product: true,
        },
    });
    return stepProd;
}
