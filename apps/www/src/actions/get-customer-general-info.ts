"use server";

import { prisma, Prisma } from "@/db";
import { sum } from "@/lib/utils";
import { AsyncFnType } from "@/types";

import { getCustomerPendingSales } from "./get-customer-pending-sales";
import { getCustomerRecentSales } from "./get-customer-recent-sales";
import { getRecentCustomerSalesTx } from "./get-customer-recent-transaction";
import { getCustomerWallet } from "@sales/wallet";

export type CustomerGeneralInfo = AsyncFnType<
    typeof getCustomerGeneralInfoAction
>;
export async function getCustomerGeneralInfoAction(accountNo) {
    const [pref, id] = accountNo?.split("-");

    let where: Prisma.CustomersWhereInput = {
        phoneNo: pref == "cust" ? undefined : accountNo,
        id: pref == "cust" ? id : undefined,
    };
    const wallet = await getCustomerWallet(prisma, accountNo);
    const customer = await prisma.customers.findFirst({
        where,
        select: {
            id: true,
            name: true,
            businessName: true,
            phoneNo: true,
            email: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    const displayName = customer?.businessName || customer?.name;
    const recentTx = await getRecentCustomerSalesTx(accountNo);
    const pendingSales = await getCustomerPendingSales(accountNo);
    const recentSales = await getCustomerRecentSales(accountNo);
    const pendingPayment = sum(pendingSales, "amountDue");
    return {
        customers: [],
        avatarUrl: null,
        email: customer?.email,
        displayName,
        isBusiness: !!customer?.businessName,
        accountNo,
        walletBalance: wallet?.balance,
        pendingPayment,
        recentTx,
        recentSales,
    };
}
