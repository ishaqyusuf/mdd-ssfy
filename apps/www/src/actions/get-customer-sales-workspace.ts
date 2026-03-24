"use server";

import {
    getSalesOrdersDta,
    getSalesQuotesDta,
} from "@/app-deps/(clean-code)/(sales)/_common/data-access/sales-dta";

export async function getCustomerSalesWorkspace(accountNo: string) {
    const [pref, id] = accountNo?.split("-");
    const baseQuery: Record<string, string | number> = {
        start: 0,
        size: 200,
    };

    if (pref === "cust") baseQuery["customer.id"] = Number(id);
    else baseQuery["phone"] = accountNo;

    const [orders, quotes] = await Promise.all([
        getSalesOrdersDta({
            ...baseQuery,
            "sales.type": "order",
        }),
        getSalesQuotesDta({
            ...baseQuery,
            "sales.type": "quote",
        }),
    ]);

    return {
        orders: orders.data,
        quotes: quotes.data,
    };
}
