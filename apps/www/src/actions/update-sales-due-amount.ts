"use server";

import { prisma } from "@/db";

import { __salesPaymentUpdated } from "./cache/cache-data-changed";
import { calculateSalesDueAmount } from "@sales/sales-transaction";

export async function updateSalesDueAmount(salesId, _tx?) {
    let tx: typeof prisma = _tx || prisma;
    if (await calculateSalesDueAmount(tx, salesId)) __salesPaymentUpdated();
}
