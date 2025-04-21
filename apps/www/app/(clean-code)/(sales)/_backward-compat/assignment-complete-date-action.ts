"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import dayjs from "dayjs";
import { date } from "zod";

export async function getAssignmentCompleteDateList() {
    const a = await prisma.orderItemProductionAssignments.findMany({
        where: {
            completedAt: null,
        },
        select: {
            id: true,
            updatedAt: true,
            lhQty: true,
            rhQty: true,
            qtyAssigned: true,
            qtyCompleted: true,
            submissions: {
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    id: true,
                    qty: true,
                    createdAt: true,
                },
                where: {
                    deletedAt: null,
                },
            },
        },
    });
    const batchDates: any = {};
    const ls = a
        .map((data) => {
            let qty = data.qtyAssigned;
            let updateData: any = {
                id: data.id,
            };
            if (data.lhQty || data.rhQty)
                if (!qty) {
                    qty = sum([data.lhQty, data.rhQty]);
                    updateData.qtyAssigned = qty;
                }
            let qtyCompleted = sum(data.submissions, "qty");
            if (data.qtyCompleted && qtyCompleted != data.qtyCompleted)
                updateData.qtyCompleted = qtyCompleted;
            if (qtyCompleted >= qty)
                updateData.completedAt =
                    data?.submissions?.[0]?.createdAt ||
                    data.updatedAt ||
                    new Date();
            const keys = Object.keys(updateData);
            if (keys.length == 2 && !!updateData.completedAt) {
                let date = dayjs(updateData.completedAt).format("DD/MM/YYYY");
                if (!batchDates?.[date])
                    batchDates[date] = {
                        ids: [],
                        date: updateData.completedAt,
                    };
                batchDates[date].ids.push(data.id);
                return null;
            }
            if (keys.length > 1) return updateData;
            return null;
        })
        .filter(Boolean);
    return [
        ...ls,
        ...Object.entries(
            batchDates as {
                [date in string]: {
                    ids: number[];
                    completedAt: any;
                };
            },
        ).map(([date, { ids, completedAt }]) => ({
            ids,
            completedAt,
            date,
        })),
    ];
}

export async function performUpdate(list) {
    await Promise.all(
        list.map(async (data) => {
            const { id, ids, date, ...update } = data;
            if (ids) {
                await prisma.orderItemProductionAssignments.updateMany({
                    where: {
                        id: {
                            in: ids,
                        },
                    },
                    data: {
                        completedAt: update.completedAt,
                    },
                });
            } else
                await prisma.orderItemProductionAssignments.update({
                    where: {
                        id,
                    },
                    data: update,
                });
        }),
    );
}
