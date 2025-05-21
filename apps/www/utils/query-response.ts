import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { PageDataMeta } from "@/types/type";

export async function queryResponse<T>(
    data: T[],
    {
        query,
        model,
        where,
    }: {
        query?;
        model?;
        where?;
    },
) {
    let meta = {} as PageDataMeta;
    if (model) {
        const count = await model.count({
            where,
        });
        const size = query?.size || 20;
        meta.count = count;
        let start = (query?.start || 0) + size;
        if (start < count)
            meta.next = {
                size: size,
                start,
            };
    }
    return {
        data,
        meta,
    };
}
export function queryMeta(query?: SearchParamsType) {
    const take = query.size ? Number(query.size) : 20;
    const { sort = "createdAt", start = 0 } = query;
    const orderBy = {
        [sort]: "desc",
    };
    const skip = Number(start);

    return {
        skip,
        take,
        orderBy,
    };
}
export async function composeQueryData(query, where, model) {
    const md = await queryResponse([], {
        query,
        model,
        where,
    });
    function response<T>(data: T[]) {
        return {
            meta: md.meta,
            data,
        };
    }
    const searchMeta = queryMeta(query);
    return {
        model,
        response,
        searchMeta,
        where,
    };
}
