"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";

interface Props {
    userId: number;
    assignmentId?: number;
    salesPaymentId?: number;
}
export async function createPayrollAction(data: Props) {
    const userId = await authId();
    const profile = await prisma.employeeProfile.findFirst({
        where: {
            employees: {
                some: {
                    id: userId,
                },
            },
        },
    });
    const salesComissionPercentage = profile?.salesComissionPercentage || 0;
}
