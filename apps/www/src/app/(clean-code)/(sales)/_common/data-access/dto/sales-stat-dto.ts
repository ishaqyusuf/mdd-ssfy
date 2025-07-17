import { SalesStat } from "@/db";
import { Colors } from "@/lib/color";
import { percent, sum, sumArrayKeys } from "@/lib/utils";

import { QtyControlType } from "../../../types";
import { overallDeliveryBreakdown } from "../../utils/dispatch-utils";
import { statStatus } from "../../utils/sales-utils";
import { GetFullSalesDataDta } from "../sales-dta";
import { salesItemGroupOverviewDto } from "./sales-item-dto";

type ItemGroup = ReturnType<typeof salesItemGroupOverviewDto>;
export function salesItemsStatsDto(
    data: GetFullSalesDataDta,
    itemGroup: ItemGroup,
) {
    const dataStats = statToKeyValueDto(data.stat);
    const calculatedStats = calculatedStatsDto(itemGroup, data);

    return {
        salesStatByKey: dataStats,
        calculatedStats,
        deliveryBreakdown: overallDeliveryBreakdown(
            itemGroup
                .map((item) =>
                    item.items
                        ?.map((it) => it.analytics.deliveryBreakdown)
                        .flat(),
                )
                .flat(),
        ),
    };
}

export function calculatedStatsDto(
    itemGroup: ItemGroup,
    data: GetFullSalesDataDta,
) {
    const cs = statToKeyValueDto(data.stat, true);
    function populate(type: QtyControlType, pending, success) {
        if (!cs[type])
            cs[type] = {
                score: 0,
                total: 0,
                salesId: data.id,
                type,
            } as any;
        const totalPending = pending?.total || 0;
        const totalSuccess = success?.total || 0;
        cs[type].score += totalSuccess;
        cs[type].total += totalPending + totalSuccess;
        cs[type].percentage = percent(cs[type].score, cs[type].total);
    }
    itemGroup.map((grp, grpIndex) => {
        // console.log(grp.items.length, grpIndex);

        grp.items?.map((item) => {
            const { pending, success } = item.analytics;
            populate("prodAssigned", pending.assignment, success.assignment);
            populate("prodCompleted", pending.production, success.production);
            populate("dispatchCompleted", pending.delivery, success.delivery);
        });
    });

    return cs;
}
export function statToKeyValueDto(dataStats: SalesStat[], reset = false) {
    // const dataStats = data.stat;
    const k: { [k in QtyControlType]: SalesStat } = {} as any;
    dataStats?.map(({ score, percentage, total, ...rest }) => {
        if (reset) {
            score = percentage = total = 0;
        }
        k[rest.type] = {
            ...rest,
            score,
            percentage,
            total,
        };
    });
    return k;
}
export function overallStatus(dataStats: SalesStat[]) {
    // console.log(dataStats);
    const sk = statToKeyValueDto(dataStats);
    const dispatch = sumArrayKeys(
        [sk.dispatchAssigned, sk.dispatchInProgress, sk.dispatchCompleted],
        ["score", "total", "percentage"],
    );

    return {
        production: statStatus(sk.prodCompleted),
        assignment: statStatus(sk.prodAssigned),
        // payment: statStatus(sk.),
        delivery: statStatus(dispatch as any),
    };
}
