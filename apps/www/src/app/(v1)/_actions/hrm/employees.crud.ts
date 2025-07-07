"use server";

import { prisma } from "@/db";

export async function _deleteEmployee(eid) {
    await prisma.users.update({
        where: {
            id: eid
        },
        data: {
            deletedAt: new Date()
        }
    });
}
