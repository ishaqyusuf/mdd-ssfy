"use server";

import { prisma } from "@/db";
import { transformData } from "@/lib/utils";
import { IHomeTask } from "@/types/community";

export interface UpdateIvoiceTasksActionProps {
  create: IHomeTask[];
  update: { id: number; data: IHomeTask }[];
}
export async function updateInvoiceTasksAction({
  create,
  update,
}: UpdateIvoiceTasksActionProps) {
  if (create.length)
    await prisma.homeTasks.createMany({
      data: create.map((h) => {
        return transformData(h);
      }) as any,
    });
  if (update.length)
    await Promise.all(
      update.map(async ({ id, data }) => {
        await prisma.homeTasks.updateMany({
          where: { id },
          data: transformData(data) as any,
        });
      })
    );
}
