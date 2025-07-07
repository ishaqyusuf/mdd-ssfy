import { prisma } from "@/db";
import { QtyControlType } from "../../types";
import { percent } from "@/lib/utils";
import { statStatus } from "../utils/sales-utils";
import {
    getFullSaleById,
    GetSalesItemOverviewDta,
    typedFullSale,
} from "./sales-dta";
import { salesOverviewDto } from "./dto/sales-item-dto";

export async function initSalesProgressDta(id) {}
export async function salesAssignmentCreated(orderId, qty) {
    await updateSalesProgressDta(orderId, "prodAssigned", {
        plusScore: qty,
    });
}
async function createSalesProgressDta(
    salesId,
    type: QtyControlType,
    total,
    score
) {
    return;
    await prisma.salesStat.create({
        data: {
            score,
            total,
            ...statMeta(total, score),
            salesId,
            type,
        },
    });
}
async function generateMissingStatsDta(salesId) {
    const data = typedFullSale(await getFullSaleById(salesId));
    const overview = salesOverviewDto(data);
    // await Promise.all(
    // Object.values(overview.stat.calculatedStats).map(async (stat) => {
    //     // console.log(stat);
    //     if (!stat.id)
    //         await createSalesProgressDta(
    //             stat.salesId,
    //             stat.type as any,
    //             stat.total,
    //             stat.score
    //         );
    //     else {
    //         let _s = overview.stat.salesStatByKey?.[stat.type as any];
    //         if (_s.total != stat.total || _s.score != stat.score)
    //             await updateSalesProgressDta(
    //                 stat.salesId,
    //                 stat.type as any,
    //                 {
    //                     score: stat.score,
    //                     total: stat.total,
    //                     id: stat.id,
    //                 }
    //             );
    //     }
    // })
    // );
    // overview.
}
export async function updateSalesProgressDta(
    salesId,
    type: QtyControlType,
    { total = null, id = null, score = null, plusScore = 0, minusScore = 0 }
) {
    const stat = id
        ? { id, total, score }
        : await prisma.salesStat.findFirst({
              where: {
                  type,
                  salesId,
              },
          });
    // console.log(stat);

    // if (!stat?.id) {
    //     await generateMissingStatsDta(salesId);
    //     return;
    // }
    if (total == null) total = stat.total;
    if (score == null) score = stat.score;
    score = score + plusScore - minusScore;
    // console.log({ score, type, plusScore, minusScore });
    // await prisma.salesStat.update({
    //     where: {
    //         id: stat.id,
    //     },
    //     data: {
    //         score,
    //         total,
    //         ...statMeta(total, score),
    //     },
    // });
}
function statMeta(total, score) {
    const percentage = percent(score, total);
    console.log({ percentage });

    const status = statStatus({
        total,
        score,
        percentage,
    } as any);
    return {
        percentage,
        status: status.status,
    };
}
export async function statMismatchDta(overview: GetSalesItemOverviewDta) {
    const { calculatedStats, salesStatByKey } = overview.stat;
    let mismatch = false;
    Object.entries(calculatedStats).map(([k, d]) => {
        if (
            salesStatByKey?.[k]?.score != d?.score ||
            salesStatByKey?.[k]?.total != d?.total
        ) {
            mismatch = true;
        }
    });
    if (mismatch) {
        await Promise.all(
            Object.entries(calculatedStats).map(async ([k, d]) => {
                const sysd = salesStatByKey?.[k];
                if (sysd?.id) {
                    console.log(sysd.id);
                    await updateSalesProgressDta(overview.id, k as any, {
                        total: d.total,
                        score: d.score,
                        id: sysd.id,
                    });
                } else {
                    await createSalesProgressDta(
                        overview.id,
                        k as any,
                        d.total,
                        d.score
                    );
                }
            })
        );
    }
    return mismatch;
}
