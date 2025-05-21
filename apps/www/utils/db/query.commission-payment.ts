import { composeQuery } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";
import { prisma } from "@/db";
import { Prisma, SearchParameters } from "@prisma/client";
import { composeQueryData, queryResponse } from "../query-response";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

export function whereCommissionPayment(query: SearchParamsType) {
    const userId = query["user.id"];
    const where: Prisma.CommissionPaymentWhereInput[] = [];
    return composeQuery(where);
}
export async function commissionPaymentQueryMetaData(query: SearchParamsType) {
    const model = prisma.commissionPayment;
    const qd = await composeQueryData(
        query,
        whereCommissionPayment(query),
        model,
    );
    return {
        ...qd,
        model,
    };
}
