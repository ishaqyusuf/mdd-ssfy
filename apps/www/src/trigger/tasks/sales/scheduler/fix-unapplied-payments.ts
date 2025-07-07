import { schedules } from "@trigger.dev/sdk/v3";

const BATCH_SIZE = 50;
export const fixUnappliedPayments = schedules.task({
    id: "sales-prod-scheduler",
    // Every 08:00am
    cron: "0 8 * * *",
    run: async (payload, ctx) => {
        if (process.env.NODE_ENV !== "production") return;
        let fixed = [];
        while (true) {
            const fixPayment = await fetch(
                `${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/api/cron/fix-unapplied-payment`,
                {
                    method: "GET",
                },
            ).then((r) => r.json());
        }
    },
});
