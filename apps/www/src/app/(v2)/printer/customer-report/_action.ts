"use server";

import customerSalesOrderQuery from "@/app/(v1)/(loggedIn)/sales/(customers)/_actions/customer-sales-order-query";
import { IGetCustomerActionQuery } from "@/app/(v1)/(loggedIn)/sales/(customers)/_actions/sales-customers";
import { prisma } from "@/db";
import { formatDate } from "@/lib/use-day";
import { IAddressMeta } from "@/types/sales";
import dayjs from "dayjs";

export async function generateCustomerPrintReport(
    id,
    query: IGetCustomerActionQuery,
) {
    const salesQuery = customerSalesOrderQuery(query);
    let _customer = await prisma.customers.findFirstOrThrow({
        where: {
            id,
        },
        include: {
            addressBooks: {
                orderBy: {
                    createdAt: "desc",
                },
            },
            salesOrders: {
                where: salesQuery.salesOrders?.some ||
                    salesQuery.salesOrders?.every || {
                        type: "order",
                        deletedAt: null,
                        amountDue: {
                            gt: 0,
                        },
                    },
                include: {
                    payments: {
                        orderBy: {
                            createdAt: "desc",
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
            // payments: true,
        },
    });
    let customer = {
        ..._customer,
        addressBooks: _customer.addressBooks.map((address) => {
            return {
                ...address,
                meta: address.meta as any as IAddressMeta,
            };
        }),
    };
    let balance = 0;
    let reportFooter = {
        current: 0,
        past1: 0,
        past2: 0,
        past3: 0,
        over3: 0,
    };
    const reportTable = customer.salesOrders
        .map((order) => {
            balance += order.grandTotal;
            let orderDue = order.grandTotal;
            const payments = order.payments.map((payment) => {
                balance -= payment.amount;
                orderDue -= payment.amount;
                return {
                    dueDate: null,
                    date: formatDate(payment.createdAt),
                    amount: -1 * payment.amount,
                    id: order.id,
                    balance,
                    inv: order.orderId,
                };
            });
            if (orderDue > 0) {
                reportFooter.current += orderDue;
                if (order.paymentDueDate) {
                    const days = dayjs().diff(order.paymentDueDate, "days");
                    if (days > 90) reportFooter.over3 += orderDue;
                    else if (days > 60 && days <= 90)
                        reportFooter.past3 += orderDue;
                    else if (days > 30 && days <= 60)
                        reportFooter.past2 += orderDue;
                    else if (days >= 1 && days <= 30)
                        reportFooter.past1 += orderDue;
                    console.log({
                        days,
                        orderDue,
                    });
                }
            }
            return [
                {
                    date: formatDate(order.createdAt),
                    inv: order.orderId,
                    dueDate: order.paymentDueDate
                        ? formatDate(order.paymentDueDate)
                        : null,
                    amount: order.grandTotal,
                    balance,
                    id: order.id,
                },
                ...payments,
            ];
        })
        .flat();

    return {
        customer: [
            customer.businessName,
            customer.name,
            customer.address,
        ].filter(Boolean),
        reportTable,
        reportFooter,
        date: formatDate(dayjs()),
    };
}
