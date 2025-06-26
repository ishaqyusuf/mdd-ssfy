import { env } from "process";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

export const processSalesPaymentLink = schemaTask({
    id: "process-sales-payment-link",
    schema: z.object({
        emailToken: z.string(),
        orderIds: z.string(),
        paymentId: z.string(),
    }),
    maxDuration: 300,
    queue: {
        concurrencyLimit: 10,
    },
    run: async (args) => {
        const resp = await fetch(
            `${env.NEXT_PUBLIC_ROOT_DOMAIN}/api/cron/send-sales-email`,
            // `https://gndprodesk.com/api/cron/send-sales-email`,
            {
                method: "POST",
                body: JSON.stringify({
                    ...args,
                }),
            },
        ).then((r) => r.json());
    },
});
