"use server";

import { prisma, Prisma } from "@/db";

import { userId } from "./utils";

interface IProp {
    // progressableId?;
    // type?;
    // parentId?;
    where: {
        progressableId?;
        progressableType?: ProgressableType;
        parentId?;
        type?: ProgressType;
    }[];
}

export async function getProgress({ where: _where }: IProp) {
    const where: Prisma.ProgressWhereInput = {};

    if (_where.length == 1) {
        // const { progressableId, progressableType, parentId,type } = _where[0];
        Object.entries((_where as any)[0]).map(([k, v]) => (where[k] = v));
    } else {
        where.OR = _where;
    }
    const progress = await prisma.progress.findMany({
        where,
        orderBy: {
            createdAt: "desc",
        },
        include: {
            user: true,
        },
    });
    return progress;
}

interface IProgress {
    type?: ProgressType;
    status?;
    description?;
    headline?;
    userId?;
    parentId?;
}
export async function saveProgress(
    progressableType: ProgressableType,
    progressableId,
    progress: IProgress,
) {
    await prisma.progress.create({
        data: {
            ...progress,
            progressableId,
            progressableType,
            userId: await userId(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });
}
type ProgressType = "production" | "sales" | "delivery" | undefined;
type ProgressableType = "SalesOrder" | "SalesOrderItem" | "WorkOrder";

export interface TimelineUpdateProps {
    parentId;
    userId;
    note;
    status;
    type;
}
export async function updateTimelineAction(
    progressableType: ProgressableType,
    { parentId, note, status, type }: TimelineUpdateProps,
) {
    const authId = await userId();
    await saveProgress(progressableType, parentId, {
        headline: note,
        userId: authId,
        type,
        status,
    });
}
export async function getProgressTypes(...types: ProgressableType[]) {
    await prisma.progress.updateMany({
        where: {
            type: {
                in: ["All Types"],
            },
        },
        data: {
            type: "sales",
        },
    });
    const _types = await prisma.progress.findMany({
        distinct: "type",
        where: {
            progressableType: {
                in: types,
            },
        },
    });

    const typeList = _types.map((t) => t.type)?.filter(Boolean);
    const ls = typeList.filter(
        (t, i) =>
            typeList.findIndex(
                (t1) => t1?.toLowerCase()?.trim() == t?.toLowerCase()?.trim(),
            ) == i,
    );
    return ls;
}
