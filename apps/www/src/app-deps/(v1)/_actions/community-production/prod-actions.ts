"use server";

import { user } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { NotificationService } from "@notifications/services/triggers";
import { tasks } from "@trigger.dev/sdk/v3";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@gnd/db";

function revalidateProductionPages() {
    revalidatePath("/community/productions");
    revalidatePath("/community/unit-productions");
}

const unitProductionNotificationSelect = {
    id: true,
    homeId: true,
    projectId: true,
    taskName: true,
    home: {
        select: {
            id: true,
            lotBlock: true,
        },
    },
    project: {
        select: {
            id: true,
            title: true,
        },
    },
} satisfies Prisma.HomeTasksSelect;

type NotificationTask = Prisma.HomeTasksGetPayload<{
    select: typeof unitProductionNotificationSelect;
}>;

async function getNotificationActor() {
    const currentUser = await user();
    if (!currentUser?.id) return null;

    return {
        id: Number(currentUser.id),
        name: currentUser.name || "Unknown",
    };
}

async function getNotificationService() {
    const actor = await getNotificationActor();
    if (!actor) return null;

    return {
        actor,
        notification: new NotificationService(tasks, {
            db: prisma as any,
            userId: actor.id,
        }),
    };
}

async function getTaskNotificationContext(id: number) {
    return prisma.homeTasks.findFirst({
        where: {
            id,
            deletedAt: null,
        },
        select: unitProductionNotificationSelect,
    });
}

async function getTasksNotificationContext(ids: number[]) {
    return prisma.homeTasks.findMany({
        where: {
            id: {
                in: ids,
            },
            deletedAt: null,
        },
        select: unitProductionNotificationSelect,
    });
}

function isoNow() {
    return new Date().toISOString();
}

async function sendSingleProductionNotification(
    channel:
        | "community_unit_production_started"
        | "community_unit_production_stopped"
        | "community_unit_production_completed",
    task: NotificationTask | null,
    options?: {
        completedFromIdle?: boolean;
    },
) {
    if (!task) return;

    const notificationContext = await getNotificationService();
    if (!notificationContext) return;

    const payload = {
        taskId: task.id,
        taskName: task.taskName || "Production task",
        unitId: task.home?.id ?? task.homeId ?? null,
        unitLotBlock: task.home?.lotBlock ?? null,
        projectId: task.project?.id ?? task.projectId ?? null,
        projectName: task.project?.title ?? null,
        actorUserId: notificationContext.actor.id,
        actorName: notificationContext.actor.name,
        timestamp: isoNow(),
    };

    if (channel === "community_unit_production_started") {
        await notificationContext.notification.send(channel, {
            payload: {
                ...payload,
                status: "started",
            },
        });
        return;
    }

    if (channel === "community_unit_production_stopped") {
        await notificationContext.notification.send(channel, {
            payload: {
                ...payload,
                status: "stopped",
            },
        });
        return;
    }

    await notificationContext.notification.send(channel, {
        payload: {
            ...payload,
            status: "completed",
            completedFromIdle: options?.completedFromIdle ?? false,
        },
    });
}

function uniqueNumberValues(values: Array<number | null | undefined>) {
    return [...new Set(values.filter((value): value is number => value != null))];
}

async function sendBatchProductionNotification(
    action: "start" | "stop" | "complete",
    items: NotificationTask[],
) {
    if (!items.length) return;

    const notificationContext = await getNotificationService();
    if (!notificationContext) return;

    const projectIds = uniqueNumberValues(
        items.map((item) => item.project?.id ?? item.projectId ?? null),
    );
    const unitIds = uniqueNumberValues(
        items.map((item) => item.home?.id ?? item.homeId ?? null),
    );
    const taskIds = uniqueNumberValues(items.map((item) => item.id));
    const projectName =
        projectIds.length === 1
            ? items.find((item) => (item.project?.id ?? item.projectId) === projectIds[0])
                  ?.project?.title || null
            : null;

    await notificationContext.notification.send(
        "community_unit_production_batch_updated",
        {
            payload: {
                action,
                taskIds,
                unitIds,
                projectIds,
                count: taskIds.length,
                projectId: projectIds.length === 1 ? projectIds[0] : null,
                projectName,
                actorUserId: notificationContext.actor.id,
                actorName: notificationContext.actor.name,
                timestamp: isoNow(),
            },
            recipients: undefined,
        },
    );
}

export async function _startUnitTaskProduction(
    id: number,
    options?: {
        suppressNotification?: boolean;
    },
) {
    await prisma.homeTasks.update({
        where: { id },
        data: {
            prodStartedAt: new Date(),
            productionStatus: "Started",
            productionStatusDate: new Date()
        }
    });
    if (!options?.suppressNotification) {
        const task = await getTaskNotificationContext(id);
        await sendSingleProductionNotification(
            "community_unit_production_started",
            task,
        );
    }
    revalidateProductionPages();
}
export async function _stopUnitTaskProduction(id: number) {
    await prisma.homeTasks.update({
        where: { id },
        data: {
            prodStartedAt: null,
            producedAt: null,
            productionStatus: "Stopped",
            productionStatusDate: new Date()
        }
    });
    const task = await getTaskNotificationContext(id);
    await sendSingleProductionNotification(
        "community_unit_production_stopped",
        task,
    );
    revalidateProductionPages();
}
export async function _completeUnitTaskProduction(
    id: number,
    options?: {
        completedFromIdle?: boolean;
    },
) {
    await prisma.homeTasks.update({
        where: { id },
        data: {
            producedAt: new Date(),
            productionStatus: "Completed",
            productionStatusDate: new Date()
        }
    });
    const task = await getTaskNotificationContext(id);
    await sendSingleProductionNotification(
        "community_unit_production_completed",
        task,
        {
            completedFromIdle: options?.completedFromIdle,
        },
    );
    revalidateProductionPages();
}

export async function _startManyUnitTaskProductions(ids: number[]) {
    if (!ids?.length) return;
    await prisma.homeTasks.updateMany({
        where: {
            id: {
                in: ids,
            },
        },
        data: {
            prodStartedAt: new Date(),
            productionStatus: "Started",
            productionStatusDate: new Date(),
        },
    });
    const items = await getTasksNotificationContext(ids);
    await sendBatchProductionNotification("start", items);
    revalidateProductionPages();
}

export async function _stopManyUnitTaskProductions(ids: number[]) {
    if (!ids?.length) return;
    await prisma.homeTasks.updateMany({
        where: {
            id: {
                in: ids,
            },
        },
        data: {
            prodStartedAt: null,
            producedAt: null,
            productionStatus: "Stopped",
            productionStatusDate: new Date(),
        },
    });
    const items = await getTasksNotificationContext(ids);
    await sendBatchProductionNotification("stop", items);
    revalidateProductionPages();
}

export async function _completeManyUnitTaskProductions(ids: number[]) {
    if (!ids?.length) return;
    await prisma.homeTasks.updateMany({
        where: {
            id: {
                in: ids,
            },
        },
        data: {
            producedAt: new Date(),
            productionStatus: "Completed",
            productionStatusDate: new Date(),
        },
    });
    const items = await getTasksNotificationContext(ids);
    await sendBatchProductionNotification("complete", items);
    revalidateProductionPages();
}
