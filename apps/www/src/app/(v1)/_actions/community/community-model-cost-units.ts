"use server";

import { prisma } from "@/db";

export async function _getCommunityModelCostUnits({ pivotId, communityId }) {
    const community = await prisma.communityModels.findUnique({
        where: {
            id: communityId
        },
        include: {
            homes: {
                include: {
                    tasks: {
                        where: {
                            taskUid: {
                                not: null
                            }
                        }
                    }
                }
            },
            project: true
        }
    });
    return community as any;
}
