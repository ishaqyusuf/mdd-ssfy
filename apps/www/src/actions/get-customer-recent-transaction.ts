"use server";

import { getCustomerTransactionsAction } from "./get-customer-tx-action";
import { __gtCustomerSalesTx } from "./revalidate/get-tags";

export async function getRecentCustomerSalesTx(accountNo) {
    const data = await getCustomerTransactionsAction({
        "account.no": accountNo,
        size: 5,
        start: 0,
    });
    return data.data;
}
