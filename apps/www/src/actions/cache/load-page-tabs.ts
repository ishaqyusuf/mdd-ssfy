"use server";

import { unstable_cache } from "next/cache";
import { getLoggedInProfile } from "./get-loggedin-profile";
import { prisma } from "@/db";

export async function loadPageTabs() {
    const profile = await getLoggedInProfile();
    return unstable_cache(
        async () => {
            const tabs = await prisma.pageTabs.findMany({
                where: {
                    OR: [
                        {
                            AND: [
                                { private: true },
                                { userId: profile.userId },
                            ],
                        },

                        { private: false },
                    ],
                },
                include: {
                    tabIndices: {
                        where: {
                            userId: profile?.userId,
                            deletedAt: null,
                        },
                    },
                },
            });
            const tabByPage: {
                [page in string]: {
                    tabs: {
                        title;
                        index;
                        indexId;
                        query;
                        private: boolean;
                        tabId: number;
                    }[];
                };
            } = {};
            tabs.map((tab) => {
                if (!tabByPage?.[tab.page])
                    tabByPage[tab.page] = {
                        tabs: [],
                    };
                tabByPage[tab.page].tabs.push({
                    title: tab.title,
                    index: tab.tabIndices?.[0]?.tabIndex,
                    indexId: tab.tabIndices?.[0]?.id,
                    query: tab.query,
                    private: tab.private,
                    tabId: tab.id,
                });
            });
            return tabByPage;
        },
        [`global-page-tabs`, `user-tabs-${profile.userId}`],
        {
            tags: [`global-page-tabs`, `user-tabs-${profile.userId}`],
        },
    )();
}
