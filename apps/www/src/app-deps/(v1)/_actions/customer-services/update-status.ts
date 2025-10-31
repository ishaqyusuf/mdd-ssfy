"use server";

import { prisma } from "@/db";
import { saveProgress } from "../progress";
import { transformData } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function updateWorkOrderStatus(id, status) {
  await prisma.workOrders.update({
    where: { id },
    data: transformData({ status }, true),
  });
  saveProgress("WorkOrder", id, {
    status,
  });
  revalidatePath("");
}
