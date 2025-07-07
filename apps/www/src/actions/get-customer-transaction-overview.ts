"use server";

import { getCustomerTransactionsAction } from "./get-customer-tx-action";
import { getSalesPaymentsAction } from "./get-sales-payment";

export async function getCustomerTransactionOverviewAction(id) {
    const {
        data: [item],
    } = await getCustomerTransactionsAction({
        "customer.tx.id": id,
    });
    if (!item) throw new Error("Transaction not found");
    // const orders = await prisma
    const salesTx = await getSalesPaymentsAction({
        "customer.tx.id": item?.id,
    });
    return {
        ...item,
        salesTx,
    };
}
