"use server";

import {
    DykeStepTitleKv,
    DykeStepTitles,
} from "@/app/(clean-code)/(sales)/types";
import { DykeProducts, DykeSteps, prisma } from "@/db";
import { generateRandomString } from "@/lib/utils";

import { includeStepPriceCount } from "../../dyke-utils";
import { DykeDoorType } from "../../type";
import { createDoorSpecies } from "./create-door-species";
import { getStepForm } from "./get-dyke-step";

export async function getNextDykeStepAction(
    step: DykeSteps,
    product: DykeProducts | null,
    stepProd,
    _steps: any[] = [],
    doorType: DykeDoorType,
) {
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    let nextStepId = stepProd?.nextStepId;
    console.log({ nextStepId });
    if (product?.title == "Wood Stile & Rail") {
        nextStepId = await createDoorSpecies(step, stepProd);
        // console.log(product);
        stepProd.nextStepId = nextStepId;
    }
    if (product) {
        const customStep = await CustomStepForm(
            product,
            step.title,
            doorType,
            step.value,
        );

        if (customStep) return [..._steps, customStep];
    }
    const { stepValueId, rootStepValueId, prevStepValueId } = step;

    if (!nextStepId) {
        // const path = await prisma.
        console.log("NO NEXT STEP");
        let nextSteps = await prisma.dykeSteps.findMany({
            where: {
                title: {
                    not: step.title,
                },
                rootStepValueId: rootStepValueId || 1,
                prevStepValueId: !stepValueId ? null : stepValueId,
            },
            include: {
                _count: includeStepPriceCount,
            },
        });
        console.log({ stepValueId });

        if (!nextSteps.length && step.title == "Door Species") {
            nextSteps = await prisma.dykeSteps.findMany({
                where: {
                    value: {
                        contains: "Interior_",
                    },
                    title: "Door",
                },
                include: {
                    _count: includeStepPriceCount,
                },
            });
        }
        const ns = nextSteps[0];
        nextStepId = ns?.id;
        if (ns?.title == "Door Type" && ns?.id != 41) {
            //
            const step41 = await prisma.dykeSteps.findFirst({
                where: { id: 41 },
            });
            nextStepId = step41.id;
        }
        if (nextSteps.length > 1) {
            const matchedStep = nextSteps.filter(
                (s) =>
                    (product?.title && s.value?.endsWith(product.title)) ||
                    (s.title == "Hand" && s.id == 22),
            )[0];
            console.log("MATCHED STEP>>>", matchedStep?.id, nextStepId);
            if (matchedStep) nextStepId = matchedStep.id;
        }
    }
    if (nextStepId) {
        console.log("NEXT STEP", nextStepId);

        const stepForm = await getStepForm(nextStepId);
        const stepProd = stepForm.step?.stepProducts?.[0];
        if (!isCustomStep(stepForm.step?.title, doorType)) {
            if (hiddenSteps(stepForm.step?.title, doorType)) {
                stepForm.item.meta.hidden = true;
                stepForm.item.stepId = stepForm.step?.id as any;

                return await getNextDykeStepAction(
                    stepForm.step as any,
                    null,
                    stepProd,
                    [..._steps, stepForm],
                    doorType,
                );
            }
            let stepProds = stepForm.step?.stepProducts || [];
            stepProds = stepProds.filter(
                (p, i) =>
                    stepProds?.findIndex(
                        (p2) => p2.product?.title == p.product?.title,
                    ) == i,
            );

            if (stepProds.length == 1 && stepProd) {
                stepForm.item.value =
                    stepProd?.product.title || stepProd?.product.value;
                stepForm.item.stepId = stepProd.dykeStepId;
                return await getNextDykeStepAction(
                    stepForm.step as any,
                    stepProd?.product as any,
                    stepProd,
                    [..._steps, stepForm],
                    doorType,
                );
            }
        }
        return [..._steps, stepForm];
    }
    const __s = await prisma.dykeSteps.findMany({
        where: {
            title: step.title,
        },
    });
    console.log(__s);
    console.log(step.title);

    console.log("NOT FOUND", prevStepValueId);
    return null;
}
function hiddenSteps(title, doorType: DykeDoorType) {
    let hidden = [
        "width",
        "hand",
        "casing 1x4 setup",
        "--jamb stop",
        "rip jamb",
        "jamb size",
        "jamb species",
    ].includes(title?.toLowerCase());
    if (doorType == "Moulding") {
    }
    if (doorType == "Bifold" && !hidden) {
        hidden = [
            // "door configuration",
            // "door type",
            "bore",
            "jamb size",
            "casing",
            "jamb species",
            "jamb type",
            "cutdown height",
            "casing y/n",
            "hinge finish",
            "casing side choice",
            "casing species",
            "cutdown height",
        ].includes(title?.toLowerCase());
    }
    if (doorType == "Door Slabs Only" && !hidden) {
        hidden = [
            "door configuration",
            "bore",
            "jamb size",
            "casing",
            "jamb species",
            "jamb type",
            "cutdown height",
            "casing y/n",
            "hinge finish",
            "door type",
            "casing side choice",
            "casing species",
            "cutdown height",
        ].includes(title?.toLowerCase());
    }
    return hidden;
}
function isCustomStep(stepTitle, doorType: DykeDoorType) {
    return (
        ["Shelf Items", "House Package Tool", "Door"] as DykeStepTitles[]
    ).includes(stepTitle);
}
async function CustomStepForm(
    { title: productTitle },
    stepTitle,
    doorType: DykeDoorType,
    stepVal,
) {
    stepTitle = stepTitle.trim();

    const customSteps: DykeStepTitleKv = {
        "Shelf Items": "Shelf Items",
        "Cutdown Height": "House Package Tool",
        "Jamb Species": "Jamb Size",
        Door: "Jamb Species",
        "Jamb Size": "Jamb Type",
    };
    let title = customSteps[productTitle] || customSteps[stepTitle];
    // console.log({ title });

    if (doorType == "Bifold") {
        // console.log(doorType);

        const customSteps: DykeStepTitleKv = {
            "Item Type": "Height",
            // "Door Configuration": "Height",
            Height: "Door Type",
            "Door Type": "Door",
            Door: "House Package Tool",
        };
        title = customSteps[productTitle] || customSteps[stepTitle];
    }
    if (doorType == "Exterior" && !title) {
        const customSteps: DykeStepTitleKv = {
            "Door Type": "Category",
            Category: "Door",
        };
        title = customSteps[productTitle] || customSteps[stepTitle];
        // console.log(stepVal);
    }
    // if (doorType == "Exterior") {
    //     // console.log(doorType);

    //     const customSteps = {
    //         Bore: "House Package Tool",
    //     };
    //     title = customSteps[productTitle] || customSteps[stepTitle];
    // }
    if (doorType == "Moulding") {
        const customSteps: DykeStepTitleKv = {
            "Item Type": "Specie",
            Specie: "Moulding",
            Moulding: "Line Item",
            // "M Casing": "Line Item",
        };
        title = customSteps[stepTitle];
        // console.log({ title, productTitle, stepTitle });
    }
    if ((doorType || productTitle) == "Services") {
        const customSteps: DykeStepTitleKv = {
            "Item Type": "Line Item",
            //  Specie: "Moulding",
            //  Moulding: "Line Item",
            // "M Casing": "Line Item",
        };
        // console.log(stepTitle);
        title = customSteps[stepTitle];
    }
    // console.log([doorType, productTitle]);

    if ((doorType || productTitle) == "Door Slabs Only") {
        // console.log(productTitle);

        const customSteps = {
            Door: "House Package Tool",
            "Item Type": "Height",
            Height: "Door Type",
            // "Door Type": "Door",
        };

        title = customSteps[stepTitle];
    }
    if (title) {
        let step = await prisma.dykeSteps.findFirst({
            where: {
                title,
            },
            include: {
                _count: includeStepPriceCount,
            },
        });

        if (!step)
            step = await prisma.dykeSteps.create({
                data: {
                    uid: generateRandomString(5),
                    title,
                },
                include: {
                    _count: includeStepPriceCount,
                },
            });
        return await getStepForm(step.id);
    }
}
