"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";

interface Props {
    userId: number;
    orderId: number;
    submissionId?: number;
    salesPaymentId?: number;
    salesAmount?: number;
    wage?: number;
    description?: string;
    headline?: string;
    itemUid?: string;
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
    const commission = data?.salesAmount
        ? formatMoney(data.salesAmount * (salesComissionPercentage / 100))
        : data?.wage;
    await prisma.payroll.upsert({
        where: {
            // orderId_productionSubmissionId_orderPaymentId: {
            orderId: data.orderId,
            orderPaymentId: data.salesPaymentId,
            productionSubmissionId: data.submissionId || null,
            // },
        },
        create: {
            amount: commission,
            itemUid: data.itemUid,
            status: "PENDING",
            type: data?.submissionId ? "WAGE" : "COMMISSION",
            userId,
            description: data.description,
            history: {
                create: {
                    status: "PENDING",
                    note: "created",
                    user: {
                        connect: { id: userId },
                    },
                },
            },
        },
        update: {
            amount: commission,
        },
    });
}
