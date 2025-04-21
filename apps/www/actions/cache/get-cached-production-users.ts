"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { Tags } from "@/utils/constants";
import { whereUsers } from "@/utils/db/where.users";

export const getCachedProductionUsers = async () => {
    return unstable_cache(
        async () => {
            const whereUser = whereUsers({
                "user.role": "Production",
            });
            const users = await prisma.users.findMany({
                where: whereUser,
                select: {
                    name: true,
                    id: true,
                    orderItemAssignments: {
                        where: {
                            deletedAt: null,
                            completedAt: null,
                            // submissions: {

                            // }
                        },
                        select: {
                            qtyAssigned: true,
                            qtyCompleted: true,
                        },
                    },
                },
            });
            return users.map((user) => {
                return {
                    id: user.id,
                    name: user.name,
                    pendingProductionQty:
                        sum(user.orderItemAssignments, "qtyAssigned") -
                        sum(user.orderItemAssignments, "qtyCompleted"),
                };
            });
        },
        [Tags.users, Tags.salesAssignments],
        {
            tags: [Tags.users, Tags.salesAssignments],
        },
    )();
};
