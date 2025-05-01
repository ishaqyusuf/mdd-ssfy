"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";

import { getSalesPaymentsAction } from "./get-sales-payment";

export async function updateSalesComissionAction(orderNo) {
    const p = await getSalesPaymentsAction({
        "order.no": orderNo,
    });

    const totalPaid = sum(p.transactions.map((v) => v.amount));

    const pr = await prisma.salesPayroll.upsert({
        where: {
            uid: `sc-${orderNo}-`,
        },
        create: {},
    });
    await prisma.salesPayout.create({
        data: {
            // status:
        },
    });
    await prisma.payrollLineItems.upsert({
        where: {
            uid: "",
        },
        create: {
            uid: "",
            amount: 1,
            salesPayrollId: 1,
        },
        update: {},
    });
}
