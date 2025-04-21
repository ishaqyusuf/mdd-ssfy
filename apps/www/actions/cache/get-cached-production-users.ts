"use server";

import { unstable_cache } from "next/cache";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { whereUsers } from "@/utils/db/where.users";

import { getUsersListAction } from "../get-users-list";

export const getCachedUsersList = async () => {
    return unstable_cache(
        async () => {
            const whereUser = whereUsers({
                "user.role": "Production",
            });
            // const users = await prisma.users.findMany({
            //     where: whereUser,
            //     select: {
            //         name: true,
            //         id:true,
            //         orderItemAssignments: {
            //             where: {
            //                 deletedAt: null,
            //                 // qtyAssigned
            //                 // submissions: {

            //                 // }
            //             }
            //         }
            //     }
            // })
            // const users = getUsersListAction({
            //     "user.role": "Production",
            // });
        },
        [Tags.users],
        {
            tags: [Tags.users],
        },
    )();
};
