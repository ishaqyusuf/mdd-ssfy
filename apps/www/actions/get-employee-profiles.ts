"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { employeesProfileQueryMetaData } from "@/utils/db/query.employees-profile";

export async function getEmployeeProfilesList(query: SearchParamsType = {}) {
    query.sort = "name.asc";
    const { model, searchMeta, where, response } =
        await employeesProfileQueryMetaData(query);

    const list = await model.findMany({
        where,
        ...searchMeta,
        select: {
            id: true,
            name: true,
            discount: true,
            salesComissionPercentage: true,
            _count: {
                select: {
                    employees: {
                        where: {
                            deletedAt: null,
                        },
                    },
                },
            },
        },
    });
    return response(
        list.map((role) => {
            return {
                ...role,
            };
        }),
    );
}
