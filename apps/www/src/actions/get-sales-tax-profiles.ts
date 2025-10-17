"use server";

import { prisma } from "@/db";
import { AsyncFnType } from "@/types";

export type GetSalesTaxProfiles = AsyncFnType<typeof getSalesTaxProfilesAction>;
export async function getSalesTaxProfilesAction() {
    const profiles = await prisma.taxes.findMany({
        where: {},
        select: {
            taxCode: true,
            percentage: true,
            title: true,
        },
    });
    return profiles;
}
