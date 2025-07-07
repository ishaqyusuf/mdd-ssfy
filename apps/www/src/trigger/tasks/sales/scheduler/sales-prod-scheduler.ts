import { schedules } from "@trigger.dev/sdk/v3";

const BATCH_SIZE = 50;
export const salesProdScheduler = schedules.task({
    id: "sales-prod-scheduler",
    // Every 08:00am
    cron: "0 8 * * *",
    run: async (payload, ctx) => {
        if (process.env.NODE_ENV !== "production") return;
    },
});
