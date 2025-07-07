"use server";

import { prisma } from "@/db";

export async function changeJobWorkerAction(jobId, oldWorkerId, newWorkerId) {
    await prisma.jobs.update({
        where: { id: jobId },
        data: {
            userId: newWorkerId,
        },
    });
}
