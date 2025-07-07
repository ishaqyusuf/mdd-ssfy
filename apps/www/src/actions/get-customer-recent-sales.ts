"use server";

import { getSalesOrdersDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

export async function getCustomerRecentSales(accountNo) {
    const query: SearchParamsType = {
        // invoice: "pending",
        "sales.type": "order",
    };
    const [p1, p2] = accountNo?.split("-");
    if (p1 == "cust") query["customer.id"] = Number(p2);
    else query["phone"] = accountNo;
    query["start"] = 0;
    query["size"] = 5;
    return (await getSalesOrdersDta(query))?.data;
}
