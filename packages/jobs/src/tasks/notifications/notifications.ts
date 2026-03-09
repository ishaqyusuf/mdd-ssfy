import { Notifications } from "@gnd/notifications";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { db } from "@gnd/db";
import { notificationJobSchema } from "@notifications/schemas";

export const notification = schemaTask({
  id: "notification",
  schema: notificationJobSchema,
  machine: "micro",
  maxDuration: 60,
  queue: {
    concurrencyLimit: 5,
  },
  run: async (data) => {
    const notifications = new Notifications(db);
    const { channel, author, recipients, payload } = data;
    if (channel === "job_task_configured") {
      const jobId = Number((payload as { jobId?: number })?.jobId);
      if (Number.isFinite(jobId) && jobId > 0) {
        await db.jobs.updateMany({
          where: {
            id: jobId,
            status: "Config Requested",
          },
          data: {
            status: "In Progress",
            statusDate: new Date(),
          },
        });
      }
    }
    logger.info("Triggering notification with data:", {
      channel,
      author,
      recipients,
      payload,
    });
    return notifications.create(channel as any, payload, {
      author,
      recipients: recipients as any,
    });
  },
});
