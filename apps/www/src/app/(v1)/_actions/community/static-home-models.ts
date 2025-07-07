"use server";

import { prisma } from "@/db";

export async function staticHomeModels() {
  const _data = await prisma.homeTemplates.findMany({
    select: {
      id: true,
      modelName: true,
    },
    orderBy: {
      modelName: "asc",
    },
  });
  return _data;
}
