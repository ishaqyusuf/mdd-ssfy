import {
    QtyControlType,
    SalesStatStatus,
} from "@/app/(clean-code)/(sales)/types";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";

import { Qty } from "./sales-control-util";

export const salesFormUrl = (type, slug?) => {
    return `/sales-book/${slug ? `edit-${type}` : `create-${type}`}${
        slug ? `/${slug}` : ""
    }`;
};

// const date = dayjs().
export function composeSalesStat(stats: Prisma.SalesStatGetPayload<{}>[]) {
    let validStat = stats.every(
        (a) => dayjs("2025-04-13").diff(a.createdAt, "D") > 0,
    );
    const _stat: { [id in QtyControlType]: (typeof stats)[number] } = {} as any;
    stats.map((s) => (_stat[s.type] = s));
    return {
        isValid: validStat,
        ..._stat,
    };
}
export function qtyControlsByType(controls: Prisma.QtyControlGetPayload<{}>[]) {
    const _stat: { [id in QtyControlType]: (typeof controls)[number] } =
        {} as any;
    controls.map((c) => (_stat[c.type] = c));
    return _stat;
}
export function formatControlQty(
    control: Prisma.QtyControlGetPayload<{}>,
): Qty {
    return {
        lh: control?.lh,
        rh: control?.rh,
        qty: control?.total,
        noHandle: !control?.lh && !control?.rh,
    };
}
export function productionStatus(qty, completed): SalesStatStatus {
    if (!qty) return "unknown";
    if (completed == 0) return "pending";
    if (qty == completed) return "completed";
    if (qty > completed && completed > 0) return "in progress";
}
