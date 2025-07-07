"use server";

import { SalesPaymentStatus } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { unstable_cache } from "next/cache";

export async function accountingConflictOrders() {
    const tags = [Tags.accountConflicts];

    return unstable_cache(
        async () => {
            const sales = await prisma.salesOrders.findMany({
                where: {},
                select: {
                    id: true,
                    payments: {
                        where: {
                            status: {
                                in: ["success"] as SalesPaymentStatus[],
                            },
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            amount: true,
                        },
                    },
                },
            });
        },
        tags,
        { tags },
    )();
}
