"use server";

import { prisma } from "@/db";
import { _unassignTask } from "../community-job/_assign-jobs";

export async function deleteJobAction({ id, taskId }) {
    if (taskId) {
        await _unassignTask({
            jobId: id,
            taskId,
            path: "jobs"
        });
    }
    //   if (job.paymentId) throw Error("Unable to delete Paid Job");
    else
        await prisma.jobs.delete({
            where: {
                id
            }
        });
}
