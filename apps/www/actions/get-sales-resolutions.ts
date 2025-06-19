"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { AsyncFnType } from "@/types";
import { __getPaymentCountBySales } from "./cached-sales-accounting";
import { getSalesResolvables } from "./cache/get-sales-resolvables";
import { PageDataMeta } from "@/types/type";

export type GetSalesResolutions = AsyncFnType<typeof getSalesResolutions>;
export async function getSalesResolutions(query: SearchParamsType) {
    const resolvables = await getSalesResolvables();

    const { start = 0, size = 10 } = query;
    const meta: PageDataMeta = {};
    const data = resolvables.filter((a, i) => i >= start);
    meta.count = resolvables.filter((a) => a.status).length;
    let nextStart;
    if (data.length > size) nextStart = size + start;
    meta.next = {
        size: 20,
        start: nextStart,
    };
    return {
        meta,
        data: data.filter((a, i) => i < size),
    };
}
