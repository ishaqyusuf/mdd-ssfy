"use server";

import { prisma } from "@/db";

export async function resetFormValueDoorStepId() {
    const vals = await prisma.dykeStepForm.findMany({
        where: {},
    });
}
