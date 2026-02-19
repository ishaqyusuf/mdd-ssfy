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

    return notifications.create(channel as any, payload, {
      author,
      recipients: recipients as any,
    });
  },
});
