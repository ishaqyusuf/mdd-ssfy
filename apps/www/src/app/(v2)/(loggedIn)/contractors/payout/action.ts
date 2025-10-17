"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";

export async function getContractorsPayroll() {
    const contractors = await prisma.users.findMany({
        where: {},
        include: {
            jobs: {
                where: {
                    deletedAt: null,
                    status: {
                        not: "Assigned",
                    },
                },
            },
        },
    });
    return contractors.map((contractor) => {
        const payableJobs = contractor.jobs.filter((j) => !j.paymentId);
        const totalPayableAmount = sum(payableJobs, "amount");
        return {
            ...contractor,
            totalPayableAmount,
            payableJobs,
        };
    });
}
