import { notificationSchema } from "@jobs/schema";
import { Notifications } from "@gnd/notifications";
import { schemaTask } from "@trigger.dev/sdk";
import { db } from "@gnd/db";

export const notification = schemaTask({
  id: "notification",
  schema: notificationSchema,
  machine: "micro",
  maxDuration: 60,
  queue: {
    concurrencyLimit: 5,
  },
  run: async (payload) => {
    const notifications = new Notifications(db);

    const { type, teamId, sendEmail = false, ...data } = payload;

    return notifications.create(type, teamId, data, {
      sendEmail,
    });
  },
});
