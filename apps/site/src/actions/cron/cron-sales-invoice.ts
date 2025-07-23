"use server";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";

export async function cronSalesInvoice() {
    const pendingInvoices = await prisma.salesOrders.findMany({
        where: {
            type: "order" as SalesType,
            amountDue: {
                gt: 0,
            },
        },
        select: {
            id: true,
            customer: {
                select: {
                    phoneNo: true,
                    email: true,
                },
            },
            billingAddress: {
                select: {
                    phoneNo: true,
                    email: true,
                },
            },
        },
    });
}
