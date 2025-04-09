"use server";

import { getSalesTransactionsAction } from "./get-sales-transactions";
import { __gtCustomerSalesTx } from "./revalidate/get-tags";

export async function getRecentCustomerSalesTx(accountNo) {
    const data = await getSalesTransactionsAction({
        "account.no": accountNo,
        size: 5,
        start: 0,
    });
    return data.data;
}
