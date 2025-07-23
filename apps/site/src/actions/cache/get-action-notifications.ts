"use server";

import { prisma } from "@/db";
import { Events, Tags } from "@/utils/constants";
import { revalidatePath, unstable_cache } from "next/cache";

export const getActionNotifications = async () => {
    const { newEvents, events } = await unstable_cache(
        async () => {
            const nots = await prisma.siteActionNotification.findMany({
                where: {},
                include: {
                    activeUsers: true,
                },
            });
            const events = Object.keys(Events);
            const newEvents = await Promise.all(
                events
                    .filter((e) => !nots.find((a) => a.event == e))
                    ?.map(async (e) => {
                        return await prisma.siteActionNotification.create({
                            data: {
                                event: e,
                                custom: false,
                                enabled: false,
                            },
                            include: {
                                activeUsers: true,
                            },
                        });
                    })
            );

            return { events: nots, newEvents };
        },
        [Tags.siteActionNotifications],
        {
            tags: [Tags.siteActionNotifications],
        }
    )();
    if (newEvents.length) revalidatePath(Tags.siteActionNotifications);
    return [...events, ...newEvents];
};
