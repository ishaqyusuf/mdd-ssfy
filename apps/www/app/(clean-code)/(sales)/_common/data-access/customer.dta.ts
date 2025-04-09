import {
    getPageInfo,
    pageQueryFilter,
} from "@/app/(clean-code)/_common/utils/db-utils";
import { AsyncFnType } from "@/app/(clean-code)/type";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma, Prisma } from "@/db";
import { sum } from "@/lib/utils";
import { whereCustomers } from "@/utils/db/where.customer";

import { SalesMeta, SalesType } from "../../types";
import { getCustomerWalletInfoDta } from "./wallet/wallet-dta";

export type CustomersQueryParams = Pick<SearchParamsType, "search" | "address">;
export type GetCustomersDta = AsyncFnType<typeof getCustomersDta>;

export async function getCustomersDta(query: CustomersQueryParams) {
    const where = whereCustomers(query);
    const data = await prisma.customers.findMany({
        where,
        ...pageQueryFilter(query),
        distinct: "phoneNo",
        orderBy: {
            createdAt: "desc",
        },
        include: {
            _count: {
                select: {
                    salesOrders: {
                        where: {
                            type: "order" as SalesType,
                        },
                    },
                },
            },
        },
    });
    const pageInfo = await getPageInfo(query, where, prisma.customers);
    return {
        ...pageInfo,
        data: data.map((data) => {
            return {
                ...data,
                accountNo: data?.phoneNo || `cust-${data?.id}`,
            };
        }),
    };
}
export async function getCustomersSimpleListDta() {
    const data = await prisma.customers.findMany({
        select: {
            phoneNo: true,
            name: true,
            businessName: true,
        },
        distinct: "phoneNo",
    });
    return data;
}
export async function updateCustomerEmailDta(id, email) {
    if (!id) throw new Error("Customer id is required");
    await prisma.customers.update({
        where: {
            id,
        },
        data: {
            email,
        },
    });
}
export async function saveCustomerDta(data: Prisma.CustomersCreateInput) {
    const customer = await prisma.customers.upsert({
        where: {
            phoneNo: data.phoneNo,
        },
        create: data,
        update: {
            businessName: data.businessName || undefined,
            email: data.email || undefined,
            name: data.name || undefined,
            phoneNo2: data.phoneNo2 || undefined,
        },
    });

    return customer;
}
export async function getCustomerProfileDta(phoneNo) {
    const customer = await prisma.customers.upsert({
        where: {
            phoneNo,
            // OR: [{ name: { not: null } }, { businessName: { not: null } }],
        },
        create: {
            phoneNo,
        },
        update: {},
        select: {
            name: true,
            businessName: true,
            phoneNo: true,
        },
    });
    return {
        displayName: customer.businessName || customer.name,
        isBusiness: customer.businessName != null,
        phoneNo: customer.phoneNo,
    };
}
export async function getCustomerNameDta(phoneNo) {
    const customer = await getCustomerProfileDta(phoneNo);
    return customer?.displayName?.toUpperCase();
}
export async function getCustomerOverviewDta(phoneNo) {
    const profile = await getCustomerProfileDta(phoneNo);
    const customerInfo = await getCustomerSalesInfoDta(phoneNo);
}
export async function getCustomerSalesInfoDta(phoneNo) {
    const salesList = (
        await prisma.salesOrders.findMany({
            where: {
                OR: [
                    {
                        customer: { phoneNo },
                    },
                    {
                        billingAddress: { phoneNo },
                    },
                    {
                        shippingAddress: { phoneNo },
                    },
                ],
            },
            select: {
                id: true,
                amountDue: true,
                type: true,
                orderId: true,
                stat: true,
                grandTotal: true,
                createdAt: true,
                meta: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            // take: 20,
        })
    )?.map((s) => {
        const { meta, ...rest } = s;
        return {
            ...s,
            po: (meta as any as SalesMeta)?.po,
        };
    });
    const orders = salesList.filter((a) => a.type == ("order" as SalesType));
    const quotes = salesList.filter((a) => a.type == ("quote" as SalesType));
    const wallet = await getCustomerWalletInfoDta(phoneNo);
    return {
        quotes,
        wallet,
        orders: orders.map((order) => {
            return {
                ...order,
            };
        }),
    };
}
export async function getCustomerPaymentInfo(phoneNo) {
    const orders = await prisma.salesOrders.findMany({
        where: {
            OR: [
                {
                    customer: { phoneNo },
                },
                {
                    billingAddress: { phoneNo },
                },
                {
                    shippingAddress: { phoneNo },
                },
            ],
            type: "order" as SalesType,
            amountDue: {
                gt: 0,
            },
        },
        select: {
            id: true,
            amountDue: true,
            grandTotal: true,
            type: true,
            orderId: true,
            stat: true,
        },
    });

    const amountDue = sum(orders, "amountDue");
    return {
        amountDue,
        orders,
    };
}

export async function getCustomerIdByPhoneNo(phoneNo) {
    return (
        await prisma.customers.findFirst({
            where: {
                phoneNo,
            },
        })
    )?.id;
}
