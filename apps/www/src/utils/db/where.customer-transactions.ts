import { SquarePaymentStatus } from "@/_v2/lib/square";
import { composeQuery } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";
import { PaymentMethods } from "@/app/(clean-code)/(sales)/types";
import {
    FilterKeys,
    SearchParamsType,
} from "@/components/(clean-code)/data-table/search-params";
import { prisma, Prisma } from "@/db";
import { SalesHaving } from "../constants";
import { CustomerTransactionType } from "@/actions/get-customer-tx-action";

export function whereCustomerTx(query: SearchParamsType) {
    let whereAnd: Prisma.CustomerTransactionWhereInput[] = [
        {
            OR: [
                {
                    status: {
                        in: [
                            "success",
                            "cancelled",
                            "canceled",
                        ] as any as SquarePaymentStatus[],
                    },
                    paymentMethod: {
                        not: null,
                    },
                    salesPayments: { some: {} },
                },
                // {
                //     AND: [
                //         // { type: {} },
                //         { type: "transaction" as CustomerTransactionType },
                //         {
                //             amount: {
                //                 gt: 0,
                //             },
                //         },
                //         { salesPayments: { some: {} } },
                //     ],
                // },
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
    if (query["orderNo"])
        whereAnd.push({
            salesPayments: {
                some: {
                    order: {
                        orderId: {
                            in: query["orderNo"]?.split(","),
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
    if (query["payment.type"]) {
        whereAnd.push({
            // type: query["payment.type"],
            paymentMethod: query["payment.type"],
            // salesPayments: {
            //     some: {

            //     }
            // }
        });
    }
    const keys = Object.keys(query) as FilterKeys[];
    keys.map((k) => {
        const val = query?.[k] as any;
        if (!query?.[k]) return;
        switch (k) {
            case "salesRep.id":
                whereAnd.push({
                    salesPayments: {
                        some: {
                            order: {
                                salesRepId: val,
                                deletedAt: null,
                            },
                            deletedAt: null,
                        },
                    },
                });
                break;
            case "sales.ids":
                whereAnd.push({
                    salesPayments: {
                        some: {
                            orderId: {
                                in: query["sales.ids"],
                            },
                        },
                    },
                });

                break;
        }
    });
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
