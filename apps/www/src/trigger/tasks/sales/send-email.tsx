import { schemaTask } from "@trigger.dev/sdk/v3";
import { env } from "process";
import { z } from "zod";

export const sendInvoiceEmail = schemaTask({
    id: "send-invoice-email",
    schema: z.object({
        salesId: z.number(),
        // customerEmail: z.string(),
        // salesRep: z.string(),
        // salesRepEmail: z.string(),
        // customerName: z.string(),
    }),
    maxDuration: 300,
    queue: {
        concurrencyLimit: 10,
    },
    run: async ({ salesId }) => {
        const resp = await fetch(
            `${env.NEXT_PUBLIC_ROOT_DOMAIN}/api/cron/send-sales-email`,
            // `https://gndprodesk.com/api/cron/send-sales-email`,
            {
                method: "POST",
                body: JSON.stringify({
                    salesId,
                }),
            },
        ).then((r) => r.json());
        // .then((r) => r.body)
        // .catch((e) => {
        //     logger.error(e.message);
        // });
        //     if(!resp.ok)
        //         throw new Error(resp.)
        // console.log(">>>>>>>>");
    },
});
