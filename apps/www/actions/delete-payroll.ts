"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";

export async function deletePayroll(id: number) {
    const actorId = await authId();

    const payroll = await prisma.payroll.findUnique({
        where: { id },
    });

    if (!payroll) throw new Error("Payroll not found");

    // If already deleted
    if (payroll.deletedAt) throw new Error("Payroll already deleted");
    //  __salesPayrollUpdated({
    //         orderId: data.orderId,
    //         userId: data.userId,
    //     });
    // if (payroll.status === "PAID") {
    //     // Reverse logic: create a negative payroll
    //     await prisma.payroll.create({
    //         data: {
    //             amount: -payroll.amount,
    //             type: payroll.type,
    //             userId: payroll.userId,
    //             orderId: payroll.orderId,
    //             orderPaymentId: payroll.orderPaymentId || undefined,
    //             productionSubmissionId:
    //                 payroll.productionSubmissionId || undefined,
    //             description: `Reversal of payroll #${payroll.id}`,
    //             status: "PAID",
    //             createdById: actorId,
    //             reversedPayrollId: payroll.id, // optional field for tracking
    //         },
    //     });
    // } else {
    //     // Soft delete
    //     await prisma.payroll.update({
    //         where: { id },
    //         data: {
    //             deletedAt: new Date(),
    //             updatedById: actorId,
    //         },
    //     });
    // }
}
