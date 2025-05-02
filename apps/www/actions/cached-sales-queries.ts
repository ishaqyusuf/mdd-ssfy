"use server";

import { unstable_cache } from "next/cache";
import { getSalesListDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

export async function getMyRecentSales(query: SearchParamsType) {
    query["size"] = 10;
    return unstable_cache(getSalesListDta, ["rencent_sales"], {
        tags: [`rencent_sales_${query?.["salesRep.id"]}`],
    })(query);
}
