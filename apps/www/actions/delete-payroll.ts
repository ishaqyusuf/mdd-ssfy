"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { PayoutStatus, prisma } from "@/db";
import { payrollUidSearch } from "@/utils/sales-utils";

export async function deleteSalesCommission(paymentId) {
    const payroll = await prisma.payroll.findFirst({
        where: {
            itemUid: payrollUidSearch(paymentId, "pid"),
        },
    });
    if (payroll) await deletePayroll(payroll.id);
}
export async function deletePayroll(id: number) {
    const actorId = await authId();

    const payroll = await prisma.payroll.findUnique({
        where: { id },
    });

    if (!payroll) throw new Error("Payroll not found");

    if (payroll.deletedAt) throw new Error("Payroll already deleted");

    if (payroll.status === PayoutStatus.COMPLETED) {
        // Reverse logic: create a negative payroll
        await prisma.payroll.create({
            data: {
                amount: -payroll.amount,
                type: payroll.type,
                userId: payroll.userId,
                orderId: payroll.orderId,
                orderPaymentId: payroll.orderPaymentId || undefined,
                productionSubmissionId:
                    payroll.productionSubmissionId || undefined,
                description: `Reversal of payroll #${payroll.id}`,
                status: "COMPLETED",
                // createdById: actorId,
                uid: `${payroll.uid}`,
                // reversedPayrollId: payroll.id, // optional field for tracking
            },
        });
    } else {
        // Soft delete
        await prisma.payroll.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                // updatedById: actorId,
            },
        });
    }
}
