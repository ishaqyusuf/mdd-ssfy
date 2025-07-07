"use server";

import { prisma } from "@/db";

export async function saveEmailTemplate(id, data) {
    let result = id
        ? await prisma.mailGrids.update({
              where: { id },
              data: {
                  ...data,
              },
          })
        : await prisma.mailGrids.create({
              data: {
                  ...data,
                  createdAt: new Date(),
              },
          });
    return result;
}
