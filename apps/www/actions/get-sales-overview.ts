"use server";

import { getSalesOrdersDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";

export async function getSalesOverviewAction(orderNo) {
    const { data } = await getSalesOrdersDta({
        "order.no": orderNo,
    });
    const [sales] = data;
    console.log(sales);

    return sales;
}
