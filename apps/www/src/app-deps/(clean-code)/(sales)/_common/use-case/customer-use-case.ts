"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";
import {
    getCustomerPaymentInfo,
    getCustomerProfileDta,
    getCustomerSalesInfoDta,
    getCustomersSimpleListDta,
} from "../data-access/customer.dta";

export type GetCustomerOverviewUseCase = AsyncFnType<
    typeof getCustomerOverviewUseCase
>;

export async function getCustomerOverviewUseCase(phoneNo) {
    const profile = await getCustomerProfileDta(phoneNo);
    const salesInfo = await getCustomerSalesInfoDta(phoneNo);
    const paymentInfo = await getCustomerPaymentInfo(phoneNo);
    const tabs = [
        { title: "Sales", badge: salesInfo.orders.length },
        { title: "Quotes", badge: salesInfo.quotes.length },
        { title: "Payments" },
    ];
    return {
        profile,
        salesInfo,
        paymentInfo,
        tabs,
    };
}
export type GetCustomersSelectListUseCase = AsyncFnType<
    typeof getCustomersSelectListUseCase
>;
export async function getCustomersSelectListUseCase() {
    return (await getCustomersSimpleListDta()).map((customer) => {
        return {
            value: customer.phoneNo,
            label: `${customer.phoneNo || ""} ${
                customer.businessName || customer.name
            }`,
            customer,
        };
    });
}
