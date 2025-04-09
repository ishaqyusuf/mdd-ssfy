"use server";

import { prisma } from "@/db";

import { getSalesTransactionsAction } from "./get-sales-transactions";

export async function getCustomerTransactionOverviewAction(id) {
    const {
        data: [item],
    } = await getSalesTransactionsAction({
        "customer.tx.id": id,
    });
    // const orders = await prisma

    return item;
}
