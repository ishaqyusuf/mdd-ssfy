import { Builders, Homes, Prisma, Projects } from "@/db";
import { ExtendedHome, ICostChartMeta, IHome } from "@/types/community";

import { deepCopy } from "../deep-copy";
import { getBadgeColor } from "../color";
import { formatDate } from "../use-day";
import { convertToNumber } from "../use-number";
import { sumKeyValues } from "../utils";

export function getHomeProductionStatus(home: ExtendedHome) {
    const prod = home?.tasks?.filter((t) => t.produceable);
    let prodDate: any = null;
    // if (home.builderId == 14)

    const produceables = prod?.length;
    let produced = prod?.filter((p) => p.producedAt).length;
    const hasJob = home?.jobs?.length;
    if (hasJob) produced = prod.length;
    const pending = produceables - produced;
    let productionStatus = "Idle";
    if (home.id == 10217) {
    }
    const sent = prod?.filter((p) => p.sentToProductionAt)?.length;
    prodDate = prod.filter((p) => p.productionDueDate)?.[0]?.productionDueDate;
    if (sent > 0) productionStatus = "Queued";
    if (produced > 0) {
        productionStatus = "Started";
        if (produced == produceables) {
            productionStatus = "Completed";
            prodDate = prod.filter((p) => p.producedAt)?.[0]?.producedAt;
        }
    }
    if (hasJob) {
        productionStatus = "Completed";
        prodDate = prod.filter((p) => p.producedAt)?.[0]?.producedAt;
    }
    if (prodDate) prodDate = formatDate(prodDate);
    return {
        prodDate,
        produceables,
        produced,
        pendingProduction: pending,
        productionStatus,
        badgeColor: getBadgeColor(productionStatus),
    };
}
export function homeSearchMeta(
    home: Homes,
    project: Projects | undefined = undefined,
    builder: Builders | undefined = undefined,
) {
    const search: any[] = [];
    const { modelName, lot, block } = home;
    if (lot) search.push(`lot${lot} l${lot}`);
    if (block) search.push(`blk${block} b${block}`);
    if (lot && block) search.push(`${lot}/${block}`);
    return search.join(" ");
}
export function hasConflictingDateRanges(dateRanges) {
    dateRanges.sort((a, b) => a.startDate - b.startDate); // Sort date ranges by start date

    for (let i = 0; i < dateRanges.length - 1; i++) {
        const currentRange = dateRanges[i];
        const nextRange = dateRanges[i + 1];

        if (currentRange.endDate >= nextRange.startDate) {
            // Conflicting date ranges found
            return true;
        }
    }
    // No conflicting date ranges found
    return false;
}
export function calculateHomeInvoice(home: ExtendedHome) {
    const data = {
        paid: 0,
        due: 0,
        chargeBack: 0,
    };
    home.tasks?.map((task) => {
        const due = task.amountDue || 0;
        const paid = task.amountPaid || 0;
        data.due += due;
        if (paid >= 0) {
            data.paid += paid;
        } else data.chargeBack += paid;
    });
    return data;
}
export function calculateCommunitModelCost(_cost, builderTasks) {
    if (!_cost) return;
    let cost = deepCopy<ICostChartMeta>(_cost);
    if (!cost.tax) cost.tax = {};
    if (!cost.costs) cost.costs = {};
    cost.totalCost = sumKeyValues(cost.costs);
    cost.totalTax = sumKeyValues(cost.tax);

    cost.sumCosts = {};
    builderTasks?.map((task) => {
        const k = task.uid;
        const tv = cost.tax?.[k] || 0;
        const cv = cost.costs?.[k] || 0;
        cost.sumCosts[k] = convertToNumber(cv, 0) + convertToNumber(tv, 0);
    });
    cost.grandTotal = sumKeyValues(cost.sumCosts);

    return cost;
}
export function getPivotModel(model) {
    if (!model) return "";
    const pivotM = model
        .toLowerCase()
        .split(" ")
        .flatMap((part) => part.split("/"))
        .filter(Boolean)
        .filter((v) => !["lh", "rh", "l", "r"].includes(v))
        .join(" ");
    return pivotM;
}
export function getTwinModelName(modelName) {
    const replacements = {
        "/l": "/r",
        "/r": "/l",
        rh: "lh",
        lh: "rh",
    };
    let lm = modelName.toLowerCase();
    for (const pattern in replacements) {
        const regex = new RegExp(`${pattern}$`);
        if (regex.test(lm)) {
            return lm.replace(regex, replacements[pattern]);
            break; // Exit the loop after the first match
        }
    }
}
