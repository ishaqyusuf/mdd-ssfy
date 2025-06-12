"use server";

import { prisma } from "@/db";
import z from "zod";

import { createSiteActionTicket } from "./create-site-action-ticket";
import { actionClient } from "./safe-action";
import { updateSalesDueAmount } from "./update-sales-due-amount";
import { deleteSalesCommission } from "./delete-payroll";
import { SalesPaymentStatus } from "@/app/(clean-code)/(sales)/types";
import { SquarePaymentStatus } from "@/_v2/lib/square";

const schema = z.object({
    salesPaymentId: z.number(),
});
export const cancelSalesPaymentAction = actionClient
    .schema(schema)
    .metadata({
        name: "cancel-sales-payment",
        track: {},
    })
    .action(async ({ parsedInput: { salesPaymentId, ...input } }) => {
        return await prisma.$transaction(async (prisma) => {
            const sp = await prisma.salesPayments.update({
                where: {
                    id: salesPaymentId,
                    status: {
                        not: "cancelled" as SalesPaymentStatus,
                    },
                },
                data: {
                    status: "cancelled",
                },
                select: {
                    transactionId: true,
                    amount: true,
                    orderId: true,
                    id: true,
                },
            });
            await prisma.customerTransaction.update({
                where: {
                    id: sp.transactionId,
                },
                data: {
                    // amount: {
                    //     decrement: sp.amount,
                    // },
                    status: "CANCELED" as SquarePaymentStatus,
                },
            });
            await updateSalesDueAmount(sp?.orderId, prisma);
            await createSiteActionTicket({
                type: "sales-payment",
                event: "cancelled",
                meta: {
                    id: sp.id,
                },
            });
        });
    });
