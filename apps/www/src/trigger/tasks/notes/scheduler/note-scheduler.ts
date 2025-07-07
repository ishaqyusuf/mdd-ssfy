import { schedules } from "@trigger.dev/sdk/v3";

export const noteScheduler = schedules.task({
    id: "note-scheduler",
    // Every 08:00am
    cron: "0 8 * * *",
    run: async (payload, ctx) => {
        if (process.env.NODE_ENV !== "production") return;
    },
});
