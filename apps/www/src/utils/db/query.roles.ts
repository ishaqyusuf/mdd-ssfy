import { composeQuery } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";
import { prisma } from "@/db";
import { Prisma } from "@/db";
import { composeQueryData } from "../query-response";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

export function whereRoles(query: SearchParamsType) {
    const {} = query;
    const where: Prisma.RolesWhereInput[] = [];

    return composeQuery(where);
}
export async function rolesQueryMetaData(query: SearchParamsType) {
    const model = prisma.roles;
    const qd = await composeQueryData(query, whereRoles(query), model);
    return {
        ...qd,
        model,
    };
}
