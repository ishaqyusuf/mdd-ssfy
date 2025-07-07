"use server";

import { prisma } from "@/db";
import { errorHandler } from "@/modules/error/handler";
import { z } from "zod";
import { actionClient } from "./safe-action";
import { getTerminalPaymentStatus } from "@/modules/square";
import { __cancelTerminalPayment, SquarePaymentStatus } from "@/_v2/lib/square";

const schema = z.object({
    checkoutId: z.string(),
    squarePaymentId: z.string(),
});
export const cancelTerminaPaymentAction = actionClient
    .schema(schema)
    .metadata({
        name: "cancel-terminal-payment",
    })
    .action(async ({ parsedInput: { checkoutId, squarePaymentId } }) => {
        return await errorHandler(async () => {
            if (checkoutId) {
                const { status, tip } =
                    await getTerminalPaymentStatus(checkoutId);

                if (status == "COMPLETED")
                    throw new Error("Payment already received!");
                await __cancelTerminalPayment(checkoutId);
                // await prisma.squarePayments.update({
                //     where: {
                //         id: checkoutId,
                //     },
                //     data: {
                //         status: "CANCELED" as SquarePaymentStatus,
                //     },
                // });
            }
            if (squarePaymentId) {
                const r = await prisma.squarePayments.update({
                    where: {
                        id: squarePaymentId,
                        status: {
                            not: "COMPLETED" as SquarePaymentStatus,
                        },
                    },
                    data: {
                        status: "CANCELED" as SquarePaymentStatus,
                    },
                });
            }
        });
    });
