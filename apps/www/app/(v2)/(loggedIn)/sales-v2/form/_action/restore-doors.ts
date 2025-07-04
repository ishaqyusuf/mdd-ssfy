import { prisma } from "@/db";
import { generateRandomString } from "@/lib/utils";

export async function restoreDoors(dykeStepId) {
    console.log(">>>>>>>");
    const pines = await prisma.dykeDoors.findMany({
        where: {},
        distinct: "title",
        select: {
            id: true,
            stepProducts: {
                select: {
                    id: true,
                },
            },
        },
        // include: {
        //     // housePackageTools: true,
        //     stepProducts: {},
        // },
    });
    let ss = pines.filter((s) => s.stepProducts.length)[0]?.stepProducts?.[0];
    const noStepProds = pines.filter((p) => !p.stepProducts.length);
    console.log(["no-step-prods", noStepProds.length]);
    // await Promise.all(pines.filter(p => p.))
    // let unique = Array.from(new Set(pines.map((p) => p.title)));
    // console.log(["....", pines.length, unique.length]);
    await prisma.dykeStepProducts.createMany({
        data: noStepProds.map((p) => ({
            // dykeStepId,
            deletedAt: new Date(),
            dykeStepId: dykeStepId,
            doorId: p.id,
            uid: generateRandomString(5),
        })),
    });
}
