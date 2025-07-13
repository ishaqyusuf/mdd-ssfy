import { z } from "zod";
import { actionClient } from "../safe-action";
import { tasks } from "@trigger.dev/sdk/v3";
import { SendSalesEmailPayload, sendSalesEmailSchema } from "@jobs/schema";
export const sendSalesEmail = actionClient
    .schema(
        // z.object({})
        sendSalesEmailSchema,
    )
    .metadata({
        name: "send-sales-email",
    })
    .action(async ({ parsedInput: params, ctx }) => {
        const event = tasks.trigger(
            "send-sales-email",
            {} satisfies SendSalesEmailPayload,
        );
        return event;
    });

