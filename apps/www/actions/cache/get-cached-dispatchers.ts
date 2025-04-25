"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { Tags } from "@/utils/constants";
import { mergePermissionsQuery, whereUsers } from "@/utils/db/where.users";

export const getCachedDispatchers = async () => {
    return unstable_cache(
        async () => {
            const whereUser = whereUsers({
                "user.permissions": mergePermissionsQuery(
                    "viewDelivery",
                    "viewPickup",
                ),
                "user.cannot": mergePermissionsQuery("viewOrders"),
            });
            const users = await prisma.users.findMany({
                where: whereUser,
                select: {
                    name: true,
                    id: true,
                },
            });
            return users.map((user) => {
                return {
                    id: user.id,
                    name: user.name,
                    // pendingProductionQty:
                    //     sum(user.orderItemAssignments, "qtyAssigned") -
                    //     sum(user.orderItemAssignments, "qtyCompleted"),
                };
            });
        },
        [Tags.users, Tags.salesDispatchers],
        {
            tags: [Tags.users, Tags.salesDispatchers],
        },
    )();
};
