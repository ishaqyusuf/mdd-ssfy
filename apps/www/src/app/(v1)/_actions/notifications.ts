"use server";

import { JobPayments, Notifications, prisma, SalesOrders } from "@/db";
import { formatDate } from "@/lib/use-day";
import { transformData } from "@/lib/utils";
import { ExtendedHomeTasks } from "@/types/community";
import { IJobs } from "@/types/hrm";
import { ISalesOrder, ISalesOrderItem } from "@/types/sales";
import dayjs from "dayjs";

import { user, userId } from "./utils";

export type INotification = Notifications & {
    archived: Boolean;
    time;
};
export async function loadNotificationsAction() {
    const id = await userId();
    const noficiations: INotification[] = (await prisma.notifications.findMany({
        where: {
            userId: id,
        },
        take: 20,
        orderBy: {
            createdAt: "desc",
        },
    })) as any;
    return noficiations;
}
export async function deleteOldNotifications() {}
export async function getNotificationCountAction() {
    const id = await userId();
    const count = await prisma.notifications.count({
        where: {
            userId: id,
            OR: [
                {
                    seenAt: {
                        equals: null,
                    },
                },
                {
                    archivedAt: {
                        equals: null,
                    },
                },
            ],
            createdAt: {
                gte: dayjs().subtract(7, "days").toISOString(),
            },
        },
    });
    return count;
}

export async function markAsReadAction(id) {
    await prisma.notifications.update({
        where: {
            id,
        },
        data: {
            seenAt: new Date(),
        },
    });
}
export async function archiveAction(id, seenAt) {
    await prisma.notifications.update({
        where: {
            id,
        },
        data: {
            seenAt: seenAt ? seenAt : new Date(),
            archivedAt: new Date(),
        },
    });
}
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
export async function _notifyProdStarted(
    item: ISalesOrderItem,
    order: { orderId; slug; id },
) {
    const me = await user();
    await _notify(
        1,
        "sales production",
        `Production Started: ${item?.description}. by ${me.name}`,
        `/tasks/sales-production/${order.orderId}`,
    );
}
export async function _notifyProductionDateUpdate(order: SalesOrders) {
    if (order.prodId)
        await _notify(
            order.prodId,
            "sales production",
            `Production due date for (${
                order.orderId
            }) has been updated, new date: ${formatDate(order.prodDueDate)}`,
            `/tasks/sales-production/${order.orderId}`,
        );
}
export async function _notifyProductionAssigned(order: SalesOrders) {
    // const me = await user();
    await _notify(
        order.prodId,
        "sales production",
        `Order (${
            order.orderId
        }) has been assigned to you for production. Due date: ${formatDate(
            order.prodDueDate,
        )}`,
        `/tasks/sales-production/${order.orderId}`,
    );
}
export async function _notifyAdminJobSubmitted(job: IJobs) {
    // const ids = [job.id]
    await _notify(
        1,
        job.type as any,
        `New Job: ${job.title} ${job.subtitle} by ${job.user.name}`,
        `/jobs?id=${job.id}`,
    );
}
export async function _notifyTaskAssigned(task: ExtendedHomeTasks) {}
export async function _notifyWorkerPaymentPaid(
    payment: JobPayments,
    jobCount,
) {}
export async function _alert() {
    return {
        async taskAssigned(task: ExtendedHomeTasks, __taskSubtitle) {
            await _notify(
                task.assignedToId,
                "community task",
                `Task (${task.taskName} -
                ${__taskSubtitle}) has been assigned to you for installation.`,
                // `/tasks/sales-production/${order.orderId}`
            );
        },
    };
}
