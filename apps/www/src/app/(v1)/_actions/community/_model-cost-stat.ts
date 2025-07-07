"use server";

import { prisma } from "@/db";
import { ICostChart } from "@/types/community";
import { fixDbTime } from "../action-utils";
import dayjs from "dayjs";

export async function _getModelCostStat(charts: ICostChart[], templateId) {
    const stat: any = {};
    await Promise.all(
        charts.map(async _c => {
            const { startDate: from, id, endDate: to } = _c;
            if (id) {
                const _count = await prisma.homes.count({
                    where: {
                        communityTemplateId: templateId,
                        createdAt: {
                            gte: !from
                                ? undefined
                                : fixDbTime(dayjs(from)).toISOString(),
                            lte: !to
                                ? undefined
                                : fixDbTime(dayjs(to), 23, 59, 59).toISOString()
                        }
                    }
                });
                stat[id.toString()] = _count;
            }
        })
    );
    return stat;
}
