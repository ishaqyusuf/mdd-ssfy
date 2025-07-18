import {
    anyDateQuery,
    withDeleted,
} from "@/app/(clean-code)/_common/utils/db-utils";
import salesData from "@/app/(clean-code)/(sales)/_common/utils/sales-data";
import { dateEquals, fixDbTime } from "@/app/(v1)/_actions/action-utils";
import {
    FilterKeys,
    SearchParamsType,
} from "@/components/(clean-code)/data-table/search-params";
import { Prisma, prisma, SalesPriority } from "@/db";
import { formatDate } from "@/lib/use-day";
import dayjs from "dayjs";

import { ftToIn } from "../../app/(clean-code)/(sales)/_common/utils/sales-utils";
import { QtyControlType } from "../../app/(clean-code)/(sales)/types";
import { transformDate } from "@/lib/db-utils";
import { composeQuery } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";

type Queries = Prisma.SalesOrdersWhereInput[];

export function whereSales(params: SearchParamsType) {
    const queries: Queries = [];
    if (params["with.trashed"]) queries.push(withDeleted);
    if (params["trashed.only"])
        queries.push({
            deletedAt: anyDateQuery(),
        });
    const q = params.search;
    if (q) {
        const searchQ = whereSearch(q);
        if (searchQ) queries.push(searchQ);
    }
    if (params["dealer.id"])
        queries.push({
            customer: {
                auth: {
                    id: params["dealer.id"],
                },
            },
        });
    const statType = (type: QtyControlType) => type;
    const status = params["dispatch.status"];
    const invoice = params["invoice"];
    if (status) {
        switch (params["dispatch.status"]) {
            case "backorder":
                queries.push({
                    stat: {
                        some: {
                            type: statType("dispatchCompleted"),
                            AND: [
                                {
                                    percentage: {
                                        gt: 0,
                                    },
                                },
                                {
                                    percentage: {
                                        lt: 100,
                                    },
                                },
                            ],
                        },
                    },
                });
                break;
        }
    }

    queries.push({
        type: params["sales.type"],
    });
    const keys = Object.keys(params) as FilterKeys[];
    keys.map((k) => {
        const val = params?.[k] as any;
        if (!params?.[k]) return;
        switch (k) {
            case "address.id":
                queries.push({
                    OR: [
                        {
                            billingAddressId: val,
                        },
                        {
                            shippingAddressId: val,
                        },
                    ],
                });
                break;
            case "id":
                let id = String(params.id);
                if (id?.includes(","))
                    queries.push({
                        id: {
                            in: id?.split(",").map((s) => Number(s)),
                        },
                    });
                else
                    queries.push({
                        id: params.id,
                    });
                break;
            case "invoice":
                whereInvoice(queries, params);
                break;
            case "order.no":
                if (val?.includes(","))
                    queries.push({
                        orderId: {
                            in: val?.split(","),
                        },
                    });
                else
                    queries.push({
                        orderId: {
                            contains: val,
                        },
                    });
                break;
            case "po":
                queries.push({
                    meta: {
                        path: "$.po",
                        // equals: params.po,
                        string_contains: val,
                    },
                });
                break;
            case "customer.id":
                queries.push({
                    customerId: val,
                });
                break;
            case "customer.name":
                queries.push({
                    OR: [
                        {
                            customer: {
                                name: {
                                    contains: val,
                                },
                            },
                        },
                        {
                            customer: {
                                businessName: {
                                    contains: val,
                                },
                            },
                        },
                        {
                            billingAddress: {
                                name: {
                                    contains: val,
                                },
                            },
                        },
                    ],
                });
                break;
            case "phone":
                const _phoneparams = {
                    phoneNo: val,
                };
                queries.push({
                    OR: [
                        {
                            customer: _phoneparams,
                        },
                        {
                            customer: {
                                phoneNo2: val,
                            },
                        },
                        {
                            billingAddress: _phoneparams,
                        },
                        {
                            shippingAddress: _phoneparams,
                        },
                    ],
                });
                break;
            case "salesRep.id":
                queries.push({
                    salesRepId: val,
                });
                break;
            case "sales.rep":
                queries.push({
                    salesRep: {
                        name: val,
                    },
                });
                break;
            case "sales.priority":
                if (val == SalesPriority.NORMAL)
                    queries.push({
                        OR: [{ priority: null }, { priority: val }],
                    });
                queries.push({
                    priority: val,
                });
                break;
            case "production.assignedToId":
                queries.push({
                    assignments: {
                        some: {
                            deletedAt: null,
                            assignedToId: val,
                        },
                    },
                });
                break;
            case "production.dueDate":
                whereProductionDueDate(queries, params);
                break;
        }
    });
    const prodStatus = params["production.status"];
    const assignedToId = params["production.assignedToId"];
    switch (prodStatus) {
        case "completed":
            queries.push({
                itemControls: assignedToId
                    ? undefined
                    : {
                          some: {
                              qtyControls: {
                                  some: {
                                      AND: [
                                          {
                                              type: "prodAssigned" as QtyControlType,
                                              percentage: 100,
                                          },
                                          {
                                              type: "prodCompleted" as QtyControlType,
                                              percentage: 100,
                                          },
                                      ],
                                  },
                              },
                          },
                      },
                assignments: !assignedToId
                    ? undefined
                    : {
                          every: {
                              assignedToId: assignedToId,
                              deletedAt: null,
                              itemControl: {
                                  qtyControls: {
                                      every: {
                                          type: "prodCompleted" as QtyControlType,
                                          percentage: 100,
                                      },
                                  },
                              },
                          },
                      },
            });
        case "part assigned":
            queries.push({
                assignments: {
                    some: {
                        deletedAt: null,
                    },
                },
            });
        case "not completed":
            queries.push({
                type: params["sales.type"],
                itemControls: {
                    some: {
                        deletedAt: null,
                        OR: [
                            {
                                qtyControls: {
                                    some: {
                                        deletedAt: null,
                                        type: "prodCompleted" as QtyControlType,
                                        percentage: {
                                            lt: 100,
                                        },
                                    },
                                },
                            },
                            {
                                qtyControls: {
                                    none: {
                                        type: "prodCompleted" as QtyControlType,
                                    },
                                },
                            },
                        ],
                    },
                },
            });
            break;
        case "due today":
            queries.push({
                itemControls: {
                    some: {
                        deletedAt: null,
                        qtyControls: {
                            some: {
                                deletedAt: null,
                                type: "prodCompleted" as QtyControlType,
                                percentage: {
                                    not: 100,
                                },
                            },
                        },
                    },
                },
                assignments: {
                    some: {
                        assignedToId: assignedToId || undefined,
                        deletedAt: null,
                        dueDate: dateEquals(formatDate(dayjs(), "YYYY-MM-DD")),
                        // completedAt: null,
                    },
                },
            });
            break;
        case "past due":
            queries.push({
                assignments: {
                    some: {
                        assignedToId: assignedToId || undefined,
                        deletedAt: null,
                        dueDate: {
                            lt: fixDbTime(dayjs()).toISOString(),
                        },
                        // completedAt: null,
                    },
                },
            });
            // case ''
            break;
    }

    switch (params["production.assignment"]) {
        case "all assigned":
            break;
        case "not assigned":
            queries.push({
                assignments: {
                    none: {
                        deletedAt: null,
                    },
                },
            });
            break;
        case "part assigned":
            break;
    }

    if (params["account.no"])
        queries.push({
            customer: {
                phoneNo: params["account.no"],
            },
        });

    return composeQuery(queries);
}
function whereInvoice(queries: Queries, params: SearchParamsType) {
    switch (params["invoice"]) {
        case "pending":
            queries.push({
                amountDue: { gt: 0 },
            });
            break;
        case "paid":
            queries.push({
                AND: [
                    {
                        amountDue: 0,
                    },
                    {
                        grandTotal: { gt: 0 },
                    },
                ],
            });
            break;
        case "late":
            queries.push({
                AND: [
                    {
                        amountDue: { gt: 1 },
                    },
                    {
                        OR: [
                            {
                                AND: [
                                    {
                                        paymentTerm: {
                                            in: salesData.paymentTerms.map(
                                                (a) => a.value,
                                            ),
                                        },
                                    },
                                    {
                                        paymentDueDate: {
                                            lte: new Date(),
                                        },
                                    },
                                ],
                            },
                            {
                                AND: [
                                    {
                                        paymentTerm: null,
                                    },
                                    {
                                        createdAt: {
                                            lte: dayjs()
                                                .subtract(3, "month")
                                                .toISOString(),
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
            break;
        case "part-paid":
            queries.push({
                AND: [
                    {
                        amountDue: {
                            gt: 1,
                        },
                    },
                    {
                        NOT: {
                            amountDue: {
                                equals: prisma.salesOrders.fields.grandTotal,
                            },
                        },
                    },
                ],
            });
        case "overdraft":
            queries.push({
                amountDue: {
                    lt: 0,
                },
            });
            break;
    }
}
function whereProductionDueDate(queries: Queries, params: SearchParamsType) {
    const {
        "production.dueDate": prodDueDate,
        "production.assignedToId": assignedToId,
    } = params;
    const date = transformDate(prodDueDate);
    console.log({ date });
    if (!date) return;
    queries.push({
        assignments: {
            some: {
                deletedAt: null,
                dueDate: date,
                assignedToId: assignedToId || undefined,
            },
        },
    });
}
function whereSearch(params): Prisma.SalesOrdersWhereInput | null {
    const inputQ = { contains: params || undefined } as any;
    const parsedQ = parseSearchparams(params);
    if (parsedQ) {
        return {
            items: {
                some: {
                    OR: [
                        { description: params },
                        { description: parsedQ.otherparams },
                        {
                            salesDoors: {
                                some: {
                                    dimension: parsedQ.size
                                        ? {
                                              contains: parsedQ.size,
                                          }
                                        : undefined,
                                },
                            },
                            housePackageTool: {
                                OR: [
                                    {
                                        door: {
                                            title: {
                                                contains: parsedQ.otherparams,
                                            },
                                        },
                                    },
                                    {
                                        molding: {
                                            title: {
                                                contains: parsedQ.otherparams,
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        };
    }
    if (params) {
        return {
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
                {
                    billingAddress: {
                        OR: [
                            { name: inputQ },
                            { address1: inputQ },
                            {
                                phoneNo: inputQ,
                            },
                        ],
                    },
                },
                {
                    producer: {
                        name: inputQ,
                    },
                },
            ],
        };
    }
    return null;
}
export function parseSearchparams(_params) {
    let itemSearch = null;
    if (_params?.startsWith("item:")) {
        itemSearch = _params.split("item:")[1]?.trim();
        // return {
        //     itemSearch,
        // };
    }
    if (!itemSearch) return null;
    const sizePattern = /\b(\d+-\d+)\s*x\s*(\d+-\d+)\b/;
    const match = itemSearch.match(sizePattern);

    let size = "";
    let otherparams = itemSearch;

    if (match) {
        size = match[0];
        otherparams = itemSearch.replace(sizePattern, "").trim();
    }
    const spl = size.trim().split(" ");
    if (size && spl.length == 3) {
        size = `${ftToIn(spl[0])} x ${ftToIn(spl[2])}`;
    }

    return {
        size: size,
        otherparams: otherparams,
        originalparams: itemSearch,
    };
}
