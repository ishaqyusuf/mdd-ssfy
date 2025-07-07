"use server";

import { prisma } from "@/db";

import { getCustomerTransactionsAction } from "./get-customer-tx-action";

export async function getOrderTransactionHistoryAction(id) {
    const transactions = await getCustomerTransactionsAction({
        "sales.id": id,
    });
    return transactions;
}
