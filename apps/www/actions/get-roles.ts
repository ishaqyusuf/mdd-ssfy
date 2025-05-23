"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { rolesQueryMetaData } from "@/utils/db/query.roles";

export async function getRolesList(query: SearchParamsType = {}) {
    query.sort = "name.asc";
    const { model, searchMeta, where, response } =
        await rolesQueryMetaData(query);

    const list = await model.findMany({
        where,
        ...searchMeta,
        select: {
            id: true,
            name: true,
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
