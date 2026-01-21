import { type Db } from "../index.js";

export type NotificationChannel = "in_app" | "email" | "push";
export async function shouldSendNotification(
  db: Db,
  userId: any,
  notificationType: any,
  channel: NotificationChannel,
) {
  return true;
}
