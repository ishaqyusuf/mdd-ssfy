import {
  createNotificationChannelTriggers,
  type NotificationChannel,
  type NotificationTriggerInput,
} from "./payload-utils";

export * from "./payload-utils/index";

export const notify = (
  send: <TChannel extends NotificationChannel>(
    channel: TChannel,
    input: NotificationTriggerInput<TChannel>,
  ) => unknown | Promise<unknown>,
) => {
  return createNotificationChannelTriggers({
    send,
    getStoredRecipients: () => null,
  });
};
