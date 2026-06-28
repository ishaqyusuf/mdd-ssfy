"use server";

import { Notifications, prisma } from "@/db";
import { transformData } from "@/lib/utils";

import { userId } from "./utils";

export type INotification = Notifications & {
    archived: Boolean;
    time;
};
export type NotificationType =
    | "sales production"
    | "assign production"
    | "installation"
    | "community task"
    | "punchount";
export async function _notify(
    _userId,
    type: NotificationType,
    message,
    link?,
    body?,
) {
    await prisma.notifications.create({
        data: transformData({
            fromUser: {
                connect: {
                    id: (await userId()) || 0,
                },
            },
            user: {
                connect: {
                    id: _userId,
                },
            },
            meta: {
                body,
            },
            message,
            type,
            link,
        }),
    });
}
