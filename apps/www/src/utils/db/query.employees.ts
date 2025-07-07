import { composeQuery } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";
import { prisma } from "@/db";
import { Prisma } from "@/db";
import { composeQueryData } from "../query-response";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

export function whereEmployees(query: SearchParamsType) {
    const { roleId, employeeProfileId, search } = query;
    const where: Prisma.UsersWhereInput[] = [];
    if (roleId)
        where.push({
            roles: {
                some: {
                    roleId,
                },
            },
        });
    if (employeeProfileId)
        where.push({
            employeeProfileId,
        });
    const containsSearch = {
        contains: search,
    };
    if (search)
        where.push({
            OR: [
                {
                    name: containsSearch,
                },
                {
                    email: containsSearch,
                },
                {
                    phoneNo: containsSearch,
                },
            ],
        });
    return composeQuery(where);
}
export async function employeeQueryMetaData(query: SearchParamsType) {
    const model = prisma.users;
    const qd = await composeQueryData(query, whereEmployees(query), model);
    return {
        ...qd,
        model,
    };
}
