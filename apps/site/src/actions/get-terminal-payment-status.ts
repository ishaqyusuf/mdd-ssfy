"use server";

import { getTerminalPaymentStatus } from "@/modules/square";
import { z } from "zod";

import { actionClient } from "./safe-action";

const schema = z.object({
    checkoutId: z.string(),
    squarePaymentId: z.string(),
});

export const getTerminalPaymentStatusAction = actionClient
    .schema(schema)
    .metadata({
        name: "get-terminal-payment-status",
    })
    .action(async ({ parsedInput: { checkoutId, squarePaymentId } }) => {
        const { status, tip } = await getTerminalPaymentStatus(checkoutId);
        return { status, tip };
    });
export const terminalPaymentStatus = async (checkoutId) => {
    const { status, tip } = await getTerminalPaymentStatus(checkoutId);
    return { status, tip };
};
