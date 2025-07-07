"use server";

import { CustomerProfileMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { unstable_cache } from "next/cache";

export const getTaxProfilesAction = async () => {
    return unstable_cache(
        async () => {
            const ls = await prisma.taxes.findMany({
                select: {
                    taxCode: true,
                    title: true,
                },
            });
            return ls.map((d) => {
                return {
                    ...d,
                };
            });
        },
        [Tags.salesTaxCodes],
        {
            tags: [Tags.salesTaxCodes],
        }
    )();
};
