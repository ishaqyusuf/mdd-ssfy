"use server";

import { authUser } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { resolutionActions, resolutionReasons } from "@/utils/constants";
import { revalidatePath } from "next/cache";
import z from "zod";

const schema = z.object({
    salesId: z.number(),
    action: z.enum(resolutionActions),
    reason: z.enum(resolutionReasons),
});
export async function createResolution(data: z.infer<typeof schema>) {
    const auth = await authUser();
    const s = await prisma.salesResolution.create({
        data: {
            salesId: data.salesId,
            action: data.action,
            resolvedBy: auth.name,
        },
    });
    revalidatePath("sales-resolvables");
}
