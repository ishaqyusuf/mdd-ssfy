"use server";

import { getSalesOrdersDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

import { __gtCustomerSalesTx } from "./revalidate/get-tags";

export async function getCustomerSalesList(query: SearchParamsType) {
    const data = await getSalesOrdersDta(query);
    return data.data;
}
