"use server";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { revalidatePath, revalidateTag } from "next/cache";

export async function removeUserFromSiteActionNotification(id, userSiteId) {
    const resp = await prisma.siteActionNotification.update({
        where: { id },
        data: {
            activeUsers: {
                delete: {
                    id: userSiteId,
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
    if (resp?._count?.activeUsers == 0 && resp.custom)
        await prisma.siteActionNotification.update({
            where: {
                id,
            },
            data: {
                custom: false,
            },
        });
    revalidateTag(Tags.siteActionNotifications);
    revalidatePath("/settings/site-action-notifications");
}
