"use server";

import { unstable_cache } from "next/cache";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

import { getSalesActiveCustomers } from "./get-sales-active-customers-summary";
import { getSalesCommissionSummary } from "./get-sales-commission-summary";
import { getSalesTotalSalesSummary } from "./get-sales-total-sales-summary";

export async function getSalesRepCommissionSummary(query: SearchParamsType) {
    return unstable_cache(
        getSalesCommissionSummary,
        ["sales_rep_commission_summary"],
        {
            tags: [
                `sales_rep_commission_summary`,
                `sales_rep_commission_summary_${query?.["salesRep.id"]}`,
            ],
        },
    )(query);
}

export async function getSalesRepTotalSales(query: SearchParamsType) {
    return unstable_cache(
        getSalesTotalSalesSummary,
        ["sales_rep_total_sales"],
        {
            tags: [
                `sales_rep_total_sales`,
                `sales_rep_total_sales_${query?.["salesRep.id"]}`,
            ],
        },
    )(query);
}
export async function getSalesRepActiveCustomers(query: SearchParamsType) {
    return unstable_cache(
        getSalesActiveCustomers,
        ["sales_rep_active_customers"],
        {
            tags: [
                `sales_rep_active_customers`,
                `sales_rep_active_customers_${query?.["salesRep.id"]}`,
            ],
        },
    )(query);
}
