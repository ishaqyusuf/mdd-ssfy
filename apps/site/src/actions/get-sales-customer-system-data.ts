"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";
import { prisma } from "@/db";

export type GetSalesCustomerSystemData = AsyncFnType<
    typeof _getSalesCustomerSystemData
>;
export const _getSalesCustomerSystemData = async (phoneNo, profileId) => {
    if (!profileId || !phoneNo) return null;
    const customers = await prisma.customers.findMany({
        where: {
            phoneNo,
        },
        select: {
            customerTypeId: true,
            name: true,
            businessName: true,
            id: true,
            profile: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },
    });
    const profileConflicts =
        (customers.length > 0 &&
            customers.some(
                (a) =>
                    a.customerTypeId &&
                    customers.some((c) => c.customerTypeId != a.customerTypeId)
            )) ||
        !customers.every((a) => a.customerTypeId == profileId);
    // if (!profileConflicts) return null;
    const profiles = await prisma.customerTypes.findMany({
        select: {
            title: true,
            id: true,
        },
    });
    return {
        profiles,
        customers,
        profileConflicts,
    };
};
