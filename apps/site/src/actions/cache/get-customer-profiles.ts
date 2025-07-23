"use server";

import { CustomerProfileMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { unstable_cache } from "next/cache";

export const getCustomerProfilesAction = async () => {
    return unstable_cache(
        async () => {
            const ls = await prisma.customerTypes.findMany({
                select: {
                    id: true,
                    coefficient: true,
                    title: true,
                    meta: true,
                },
            });
            return ls.map((d) => {
                return {
                    ...d,
                    meta: d.meta as any as CustomerProfileMeta,
                };
            });
        },
        [Tags.salesCustomerProfiles],
        {
            tags: [Tags.salesCustomerProfiles],
        }
    )();
};
