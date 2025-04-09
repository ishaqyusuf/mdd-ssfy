"use server";

import { SalesPaymentStatus } from "@/app/(clean-code)/(sales)/types";
import { user } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import z from "zod";

import { createSiteActionTicket } from "./create-site-action-ticket";
import { actionClient } from "./safe-action";
import { updateSalesDueAmount } from "./update-sales-due-amount";

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
        return await prisma.$transaction(async (tx) => {
            const resp = await prisma.customerTransaction.update({
                where: {
                    id: transactionId,
                },
                data: {
                    // status: "" as SalesPaymentStatus,
                    deletedAt: new Date(),
                    salesPayments: {
                        updateMany: {
                            where: {},
                            data: {
                                deletedAt: new Date(),
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    salesPayments: {
                        select: {
                            orderId: true,
                        },
                    },
                },
            });
            await Promise.all(
                resp?.salesPayments?.map(async ({ orderId }) => {
                    await updateSalesDueAmount(orderId);
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
