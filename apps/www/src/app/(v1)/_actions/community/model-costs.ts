"use server";

import { prisma } from "@/db";
import { formatDate } from "@/lib/use-day";
import { transformData } from "@/lib/utils";
import { ICostChart, IHomeTemplate } from "@/types/community";
import dayjs from "dayjs";
import { revalidatePath } from "next/cache";
import { fixDbTime } from "../action-utils";

// export async function deleteModel
export async function saveModelCost(cost: ICostChart, templateId) {
    const { id: _id, parentId, ..._cost } = cost;
    let _c: ICostChart & {
        template: IHomeTemplate;
    } = null as any;
    const title = [
        cost?.startDate ? formatDate(cost?.startDate, "MM/DD/YY") : null,
        cost?.endDate ? formatDate(cost?.endDate, "MM/DD/YY") : "To Date"
    ].join(" - ");
    _cost.title = title;
    _cost.current = cost.endDate
        ? dayjs(cost.endDate).diff(dayjs(), "days") > 0
        : true;
    // _cost.model =
    if (!_id) {
        _c = (await prisma.costCharts.create({
            data: transformData({
                ..._cost,
                type: "task-costs",
                template: {
                    connect: {
                        id: templateId
                    }
                }
            }) as any,
            include: {
                template: true
            }
        })) as any;
    } else {
        _c = (await prisma.costCharts.update({
            where: {
                id: _id
            },
            data: {
                ...(_cost as any)
            },
            include: {
                template: true
            }
        })) as any;
    }
    console.log(_c);
    await Promise.all(
        Object.entries(_c.meta.costs).map(async ([k, v]) => {
            // const createdAt = {
            //     gte:  fixDbTime(dayjs(_c.startDate)).toISOString()
            // }
            // if(_c.endDate)
            //     createdAt.lte  = fixDbTime(dayjs(_c.endDate), 23, 59, 59).toISOString(),
            const { startDate: from, endDate: to } = _c;
            const s = await prisma.homeTasks.updateMany({
                where: {
                    home: {
                        builderId: _c.template.builderId,
                        createdAt: {
                            gte: !from
                                ? undefined
                                : fixDbTime(dayjs(from)).toISOString(),
                            lte: !to
                                ? undefined
                                : fixDbTime(dayjs(to), 23, 59, 59).toISOString()
                        }
                    },
                    taskUid: k
                },
                data: {
                    amountDue: Number(v) || 0,
                    updatedAt: new Date()
                }
            });
            console.log(s.count);
        })
    );
    revalidatePath("/settings/community/model-costs", "page");
    return _c;
}
