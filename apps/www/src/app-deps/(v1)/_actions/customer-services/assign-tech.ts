"use server";

import { prisma } from "@/db";

export async function assignTech(id, techId) {
  await prisma.workOrders.update({
    where: {
      id,
    },
    data: {
      tech: {
        connect: {
          id: techId,
        },
      },
    },
  });
}
