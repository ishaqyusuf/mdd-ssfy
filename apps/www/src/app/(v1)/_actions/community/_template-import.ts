"use server";

import { prisma } from "@/db";

export async function searchImport(q, id, community) {
    if (!q) return [];
    const where = {
        modelName: {
            contains: q,
        },
    } as any;
    const result = await (community
        ? prisma.communityModels.findMany({
              where,
              include: {
                  project: true,
              },
          })
        : prisma.homeTemplates.findMany({
              where,
          }));
    return result;
}
