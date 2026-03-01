import { notificationJobSchema } from "../schemas";
import type {
  NotificationAuthor,
  NotificationChannel,
  NotificationEvent,
  NotificationTriggerInput,
} from "./types";

export function buildNotificationEvent<TChannel extends NotificationChannel>(
  channel: TChannel,
  input: NotificationTriggerInput<TChannel>,
  author: NotificationAuthor,
): NotificationEvent<TChannel> {
  const event = {
    ...input,
    channel,
    author,
  } as NotificationEvent<TChannel>;

  return notificationJobSchema.parse(event) as NotificationEvent<TChannel>;
}

