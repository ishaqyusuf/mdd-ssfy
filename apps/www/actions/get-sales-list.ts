"use server";

import { getSalesListDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

export async function getSalesListAction(query: SearchParamsType) {
    return await getSalesListDta(query);
}
