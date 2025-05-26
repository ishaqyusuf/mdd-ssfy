"use server";

import { prisma } from "@/db";
import z from "zod";

import { createSiteActionTicket } from "./create-site-action-ticket";
import { actionClient } from "./safe-action";
import { updateSalesDueAmount } from "./update-sales-due-amount";
import { deleteSalesCommission } from "./delete-payroll";

const schema = z.object({
    transactionId: z.number(),
});
export const deleteCustomerTransactionAction = actionClient
    .schema(schema)
    .metadata({
        name: "delete-customer-transaction",
        track: {},
    })
    .action(async ({ parsedInput: { transactionId, ...input } }) => {
        return await prisma.$transaction(async (prisma) => {
            const resp = await prisma.customerTransaction.update({
                where: {
                    id: transactionId,
                },
                data: {
                    // deletedAt: new Date(),
                    // salesPayments: {
                    //     updateMany: {
                    //         where: {},
                    //         data: {
                    //             deletedAt: new Date(),
                    //         },
                    //     },
                    // },
                },
                select: {
                    id: true,
                    salesPayments: {
                        select: {
                            orderId: true,
                            id: true,
                        },
                    },
                },
            });
            console.log({ resp });
            await Promise.all(
                resp?.salesPayments?.map(async ({ orderId, id }) => {
                    await updateSalesDueAmount(orderId, prisma);
                    await deleteSalesCommission(id);
                }),
            );
            await createSiteActionTicket({
                type: "sales-customer-transaction",
                event: "deleted",
                meta: {
                    id: resp.id,
                },
            });
        });
    });
