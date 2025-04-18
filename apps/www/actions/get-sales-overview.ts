"use server";

import { getSalesOrdersDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";

import { resetSalesStatAction } from "./reset-sales-stat";

export async function getSalesOverviewAction(orderNo) {
    const { data } = await getSalesOrdersDta({
        "order.no": orderNo,
    });
    const [sales] = data;
    if (!sales.salesStat?.isValid) {
        // await resetSalesStatAction(sales.id);
        // await timeout(1000);
        // return await getSalesOverviewAction(orderNo);
    }
    return sales;
}
