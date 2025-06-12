import { SquarePaymentStatus } from "@/_v2/lib/square";
import { composeQuery } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";
import { PaymentMethods } from "@/app/(clean-code)/(sales)/types";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { Prisma } from "@/db";

export function whereCustomerTx(query: SearchParamsType) {
    let whereAnd: Prisma.CustomerTransactionWhereInput[] = [
        {
            OR: [
                {
                    status: {
                        in: [
                            "success",
                            "cancelled",
                        ] as any as SquarePaymentStatus[],
                    },
                    paymentMethod: {
                        not: null,
                    },
                    salesPayments: { some: {} },
                },
                {
                    AND: [
                        { type: {} },
                        // { type: "transaction" as CustomerTransactionType },
                        {
                            amount: {
                                lt: 0,
                            },
                        },
                        { salesPayments: { some: {} } },
                    ],
                },
                {
                    paymentMethod: "link" as PaymentMethods,
                    amount: {
                        gt: 0,
                    },
                    salesPayments: {
                        some: {},
                    },
                },
            ],
        },
    ];
    if (query["customer.tx.id"]) {
        whereAnd = [
            {
                id: query["customer.tx.id"],
            },
        ];
    }
    if (query["sales.tx.id"])
        whereAnd = [
            {
                salesPayments: {
                    some: {
                        id: query["sales.tx.id"],
                    },
                },
            },
        ];
    if (query["account.no"]) {
        whereAnd.push({
            wallet: {
                accountNo: query["account.no"],
            },
        });
    }
    if (query["order.no"])
        whereAnd.push({
            salesPayments: {
                some: {
                    order: {
                        orderId: {
                            in: query["order.no"]?.split(","),
                        },
                    },
                },
            },
        });
    if (query["sales.id"])
        whereAnd.push({
            salesPayments: {
                some: {
                    orderId: query["sales.id"],
                },
            },
        });
    if (query["search"]) whereAnd.push(whereSearch(query["search"]));
    return composeQuery(whereAnd);
}
function whereSearch(query) {
    const inputQ = { contains: query || undefined } as any;
    return {
        salesPayments: {
            some: {
                order: {
                    OR: [
                        { orderId: inputQ },
                        {
                            customer: {
                                OR: [
                                    {
                                        businessName: inputQ,
                                    },
                                    {
                                        name: inputQ,
                                    },
                                    {
                                        email: inputQ,
                                    },
                                    {
                                        phoneNo: inputQ,
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        },
    } satisfies Prisma.CustomerTransactionWhereInput;
}
