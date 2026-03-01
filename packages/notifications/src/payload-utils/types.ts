import type { NotificationJobInput } from "../schemas";

export type NotificationChannel = NotificationJobInput["channel"];
export type NotificationAuthor = NotificationJobInput["author"];
export type NotificationRecipients = NotificationJobInput["recipients"];
export type NotificationRecipient = NonNullable<NotificationRecipients>[number];

export type NotificationEvent<TChannel extends NotificationChannel> = Extract<
  NotificationJobInput,
  { channel: TChannel }
>;

export type NotificationTriggerInput<TChannel extends NotificationChannel> =
  Omit<NotificationEvent<TChannel>, "channel" | "author"> & {
    author?: NotificationAuthor;
  };

