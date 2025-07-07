import { composeQuery } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";
import { prisma } from "@/db";
import { Prisma } from "@/db";
import { composeQueryData } from "../query-response";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

export function whereCommissions(query: SearchParamsType) {
    const userId = query["user.id"];
    const where: Prisma.PayrollWhereInput[] = [
        { userId: userId ? +userId : undefined },
        {
            amount: {
                gte: 0,
            },
        },
        {
            order: {
                type: "order",
            },
        },
    ];
    return composeQuery(where);
}
export async function commissionQueryMetaData(query: SearchParamsType) {
    const model = prisma.payroll;
    const qd = await composeQueryData(query, whereCommissions(query), model);
    return {
        ...qd,
        model,
    };
}
