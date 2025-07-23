"use server";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { getSalesOrdersDta } from "../data-access/sales-dta";
import { AsyncFnType } from "@/app/(clean-code)/type";
import { unstable_noStore } from "next/cache";

export type GetSalesOrderList = AsyncFnType<typeof getSalesOrderListUseCase>;
export type GetSalesOrderListItem = GetSalesOrderList["data"][number];
export async function getSalesOrderListUseCase(query: SearchParamsType) {
    // query._type = "order";
    const list = await getSalesOrdersDta(query);
    return list;
}
export async function getSalesListByIdUseCase(id) {
    const data = await getSalesOrderListUseCase({
        id,
    } as any);
    const res = data?.data?.[0];
    if (!res) throw new Error("Not found");
    return res;
}
export async function getSalesOrderInfinityListUseCase(query) {
    // const search = searchParamsCache.parse(query);
    // query._type = "order";
    unstable_noStore();
    query = {
        ...query,
        _type: "order",
    };
    const list = await getSalesOrdersDta(query);
    // return list;
    // const resp = dataResponse(list.data, search);
    // const data = list.data;

    return {
        data: list.data,
        meta: {
            totalFilters: {},
            totalRowCount: list.pageInfo.totalItems,
            filterRowCount: list.data.length,
        },
    };
}
