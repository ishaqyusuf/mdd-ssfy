import { composeQuery } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";
import { prisma } from "@/db";
import { Prisma } from "@prisma/client";
import { composeQueryData } from "../query-response";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

export function whereEmployeesProfile(query: SearchParamsType) {
    const {} = query;
    const where: Prisma.RolesWhereInput[] = [];

    return composeQuery(where);
}
export async function employeesProfileQueryMetaData(query: SearchParamsType) {
    const model = prisma.employeeProfile;
    const qd = await composeQueryData(
        query,
        whereEmployeesProfile(query),
        model,
    );
    return {
        ...qd,
        model,
    };
}
