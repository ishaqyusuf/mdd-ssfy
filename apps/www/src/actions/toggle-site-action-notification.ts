"use server";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { revalidatePath, revalidateTag } from "next/cache";

export async function toggleSiteActionNotification(id, value) {
    await prisma.siteActionNotification.update({
        where: { id },
        data: {
            enabled: value,
            // custom: value ? false : undefined
        },
    });
    revalidateTag(Tags.siteActionNotifications);
    revalidatePath("/settings/site-action-notifications");
}
