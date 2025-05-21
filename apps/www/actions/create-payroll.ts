"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { payrollUid } from "@/utils/sales-utils";
import { __salesPayrollUpdated } from "./cache/cache-data-changed";

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
    // const userId = await authId();
    const profile = await prisma.employeeProfile.findFirst({
        where: {
            employees: {
                some: {
                    id: data.userId,
                },
            },
        },
    });
    const salesComissionPercentage = profile?.salesComissionPercentage || 0;
    const commission = data?.salesAmount
        ? formatMoney(data.salesAmount * (salesComissionPercentage / 100))
        : data?.wage;
    const uid = payrollUid(
        data.orderId,
        data.salesPaymentId,
        data.submissionId,
    );
    await prisma.payroll.upsert({
        where: {
            // orderId_productionSubmissionId_orderPaymentId: {
            // orderId: data.orderId,
            // orderPaymentId: data.salesPaymentId || undefined,
            // productionSubmissionId: data.submissionId || undefined,
            uid_deletedAt: {
                uid,
                deletedAt: null,
            },
            // },
        },
        create: {
            uid,
            amount: commission,
            itemUid: data.itemUid,
            status: "PENDING",
            type: data?.submissionId ? "WAGE" : "COMMISSION",
            orderId: data.orderId,
            userId: data.userId,
            description: data.description,
            history: {
                create: {
                    status: "PENDING",
                    note: "created",
                    user: {
                        connect: { id: data.userId },
                    },
                },
            },
        },
        update: {
            amount: commission,
        },
    });
    __salesPayrollUpdated({
        orderId: data.orderId,
        userId: data.userId,
    });
}
