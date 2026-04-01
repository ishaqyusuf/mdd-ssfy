"use server";

import { getSalesOrdersDta, getSalesQuotesDta } from "@/app-deps/(clean-code)/(sales)/_common/data-access/sales-dta";
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
    const salesQuery: Record<string, string | number> = {
        start: 0,
        size: 200,
    };

    let where: Prisma.CustomersWhereInput = {
        phoneNo: pref == "cust" ? undefined : accountNo,
        id: pref == "cust" ? Number(id) : undefined,
    };
    if (pref == "cust") salesQuery["customer.id"] = Number(id);
    else salesQuery["phone"] = accountNo;
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
    const [orders, quotes] = await Promise.all([
        getSalesOrdersDta({
            ...salesQuery,
            "sales.type": "order",
        }),
        getSalesQuotesDta({
            ...salesQuery,
            "sales.type": "quote",
        }),
    ]);
    const pendingPayment = sum(pendingSales, "amountDue");
    const pendingDeliveryOrders = orders.data.filter(
        (order) => order.status?.delivery?.status !== "completed"
    );

    return {
        customers: [],
        avatarUrl: null,
        email: customer?.email,
        displayName,
        isBusiness: !!customer?.businessName,
        accountNo,
        walletBalance: wallet?.balance,
        pendingPayment,
        pendingPaymentOrders: pendingSales,
        pendingDeliveryOrders,
        totalSalesCount: orders.data.length,
        totalQuotesCount: quotes.data.length,
        totalSalesValue: sum(orders.data, "invoice.total"),
        totalQuotesValue: sum(quotes.data, "invoice.total"),
        recentTx,
        recentSales,
    };
}
