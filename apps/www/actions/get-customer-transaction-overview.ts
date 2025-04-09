"use server";

import { getSalesTransactionsAction } from "./get-sales-transactions";

export async function getCustomerTransactionOverviewAction(id) {
    const {
        data: [item],
    } = await getSalesTransactionsAction({
        "customer.tx.id": id,
    });
    return item;
}
