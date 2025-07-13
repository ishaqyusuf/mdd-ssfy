"use server";
import { actionClient } from "../safe-action";
import { tasks } from "@trigger.dev/sdk/v3";
import { sendSalesEmailSchema } from "@jobs/schema";
import { env } from "@/env.mjs";
export const sendSalesEmail = actionClient
    .schema(
        // z.object({})
        sendSalesEmailSchema,
    )
    .metadata({
        name: "send-sales-email",
    })
    .action(async ({ parsedInput: params, ctx }) => {
        const event = await tasks.trigger("send-sales-email", {
            ...params,
        });

        return event;
    });

