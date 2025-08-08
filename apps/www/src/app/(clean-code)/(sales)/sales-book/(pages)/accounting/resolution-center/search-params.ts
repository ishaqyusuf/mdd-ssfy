import {
    SearchParamsKeys,
    searchParamsParser,
} from "@/components/(clean-code)/data-table/search-params";
import { createSearchParamsCache } from "nuqs/server";

const {
    "salesRep.id": salesRepId,
    orderNo: orderNo,
    "payment.type": paymentType,
    "sales.having": salesHaving,
    employeeProfileId,
    search,
} = searchParamsParser;
export const accountingPageQuery = {
    search,
    "salesRep.id": salesRepId,
    "payment.type": paymentType,
    "sales.having": salesHaving,
    orderNo: orderNo,
    employeeProfileId,
} as { [k in SearchParamsKeys]: any };
export const searchParamsCache = createSearchParamsCache(accountingPageQuery);
