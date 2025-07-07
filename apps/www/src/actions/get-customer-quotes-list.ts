"use server";

import { getSalesQuotesDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

import { __gtCustomerSalesTx } from "./revalidate/get-tags";

export async function getCustomerQuoteList(query: SearchParamsType) {
    const data = await getSalesQuotesDta(query);
    return data.data;
}
