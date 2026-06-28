"use server";

import { CustomerTypes, prisma } from "@/db";
import { ISalesSettingMeta, PostTypes } from "@/types/post";
import dayjs from "dayjs";

export interface SalessalesFormData {
    settings: ISalesSettingMeta;
    swings: (string | null)[];
    suppliers: (string | null)[];
    profiles: CustomerTypes[];
    defaultProfile: CustomerTypes;
    items: any[];
}
export async function salesFormData(dyke = false) {
    const setting = await prisma.settings.findFirst({
        where: {
            type: PostTypes.SALES_SETTINGS,
        },
    });
    const meta: ISalesSettingMeta = setting?.meta as any;

    if (!meta.dyke)
        meta.dyke = {
            customInputSection: {
                sections: [],
            } as any,
        };
    const profiles = ((await prisma.customerTypes.findMany({})) as any[]).map(
        (profile) => {
            let goodUntil: any = null;
            const goodDays = profile.meta?.goodUntil;
            if (goodDays > 0)
                goodUntil = dayjs().add(goodDays, "days").toISOString();
            return {
                label: profile.title,
                value: profile.title,
                ...profile,
                goodUntil,
            };
        },
    );

    const extras = dyke
        ? []
        : await prisma.posts.findMany({
              where: {
                  type: {
                      in: [PostTypes.SUPPLIERS, PostTypes.SWINGS],
                  },
              },
              distinct: ["title"],
              select: {
                  type: true,
                  title: true,
              },
          });

    const items = dyke
        ? []
        : await prisma.salesOrderItems.findMany({
              where: {},
              distinct: "description",
              orderBy: {
                  updatedAt: "desc",
              },
              select: {
                  description: true,
                  price: true,
              },
          });

    return {
        settings: meta,
        profiles,
        defaultProfile: profiles.find((p) => p.defaultProfile),
        swings: extras
            .filter((e) => e.type == PostTypes.SWINGS)
            .map((e) => e.title),
        suppliers: extras
            .filter((e) => e.type == PostTypes.SUPPLIERS)
            .map((e) => e.title),
        items,
    };
}
