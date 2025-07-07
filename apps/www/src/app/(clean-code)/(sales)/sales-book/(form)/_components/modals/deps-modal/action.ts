"use server";

import { prisma } from "@/db";
import { DykeStepMeta } from "../../../../../../../(v2)/(loggedIn)/sales-v2/type";

export async function saveDykeMeta(id, meta: DykeStepMeta) {
    const resp = await prisma.dykeSteps.update({
        where: { id },
        data: {
            meta: meta as any,
            updatedAt: new Date(),
        },
    });
    return resp;
}
