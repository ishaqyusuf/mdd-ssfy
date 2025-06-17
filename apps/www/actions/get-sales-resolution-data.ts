"use server";

import { AsyncFnType } from "@/types";
import { __getPaymentCountBySales } from "./cached-sales-accounting";
import { getCustomerTransactionsAction } from "./get-customer-tx-action";

export type GetSalesResolutionData = AsyncFnType<typeof getSalesResolutionData>;
export async function getSalesResolutionData(salesId) {
    const tx = await getCustomerTransactionsAction({
        "sales.id": salesId,
    });
    return {
        salesId,
        payments: tx?.data,
    };
}
