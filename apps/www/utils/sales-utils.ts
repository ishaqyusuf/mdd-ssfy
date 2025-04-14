import {
    QtyControlType,
    SalesStatStatus,
} from "@/app/(clean-code)/(sales)/types";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";

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
