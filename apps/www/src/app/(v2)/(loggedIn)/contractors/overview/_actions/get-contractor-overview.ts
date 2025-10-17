"use server";

import { getPayableUsers } from "@/app/(v1)/_actions/hrm-jobs/make-payment";
import { prisma } from "@/db";
import { IUserDocMeta } from "@/types/hrm";
import { notFound } from "next/navigation";

export async function getContractorOverviewAction(id) {
    const user = await prisma.users.findUnique({
        where: { id },
        include: {
            jobs: {
                take: 5,
                orderBy: {
                    createdAt: "desc",
                },
            },
            documents: true,
        },
    });
    if (!user) notFound();
    const paymentDetails = await getPayableUsers(id, true);
    const _jobs = await prisma.jobs.findMany({
        where: {
            userId: id,
        },
        select: {
            id: true,
            paymentId: true,
            status: true,
        },
    });
    const pendingTasks = _jobs.filter((j) => j.status == "Assigned").length;
    const completedTasks = _jobs.length - pendingTasks;
    const payments = await prisma.jobPayments.aggregate({
        _sum: {
            amount: true,
        },
        where: {
            userId: id,
        },
    });
    return {
        user: {
            ...user,
            documents: user.documents?.map((d) => ({
                ...d,
                meta: d.meta as any as IUserDocMeta,
            })),
        },
        ...paymentDetails,
        totalJobs: _jobs.length,
        pendingJobs: pendingTasks,
        sumPaid: payments._sum.amount,
        completedTasks,
    };
}
