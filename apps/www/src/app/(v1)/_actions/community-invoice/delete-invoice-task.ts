"use server";

import { prisma } from "@/db";

export async function deleteInvoiceTasks(ids) {
    await prisma.homeTasks.deleteMany({
        where: {
            id: {
                in: ids
            }
        }
    });
}
