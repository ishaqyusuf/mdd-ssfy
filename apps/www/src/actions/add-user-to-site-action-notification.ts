"use server";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { revalidatePath, revalidateTag } from "next/cache";

export async function addUserToSiteActionNotification(id, userId) {
    await prisma.siteActionNotification.update({
        where: { id },
        data: {
            custom: true,
            activeUsers: {
                createMany: {
                    skipDuplicates: true,
                    data: [
                        {
                            userId,
                        },
                    ],
                },
            },
        },
        select: {
            custom: true,
            _count: {
                select: {
                    activeUsers: true,
                },
            },
        },
    });

    revalidateTag(Tags.siteActionNotifications);
    revalidatePath("/settings/site-action-notifications");
}
