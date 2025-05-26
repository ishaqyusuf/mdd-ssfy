"use server";

import { prisma } from "@/db";
import { deleteSalesCommission } from "./delete-payroll";

interface Props {
    salesId;
    paymentId;
    fundAction: "wallet" | "refunded";
}
export async function deleteSalesPaymentAction(salesId, paymentId) {
    const del = await prisma.salesPayments.update({
        where: {
            id: paymentId,
        },
        data: {
            updatedAt: new Date(),
        },
        include: {
            transaction: true,
        },
    });
    await deleteSalesCommission(paymentId);
}
