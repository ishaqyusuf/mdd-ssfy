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

import { composeQuery } from "../../app/(clean-code)/(sales)/_common/utils/db-utils";
import { ftToIn } from "../../app/(clean-code)/(sales)/_common/utils/sales-utils";
import { QtyControlType } from "../../app/(clean-code)/(sales)/types";

export function whereSales(query: SearchParamsType) {
    const whereAnd: Prisma.SalesOrdersWhereInput[] = [];
    if (query["with.trashed"]) whereAnd.push(withDeleted);
    if (query["trashed.only"])
        whereAnd.push({
            deletedAt: anyDateQuery(),
        });
    const q = query.search;
    if (q) {
        const searchQ = whereSearch(q);
        if (searchQ) whereAnd.push(searchQ);
    }
    if (query["dealer.id"])
        whereAnd.push({
            customer: {
                auth: {
                    id: query["dealer.id"],
                },
            },
        });
    const statType = (type: QtyControlType) => type;
    const status = query["dispatch.status"];
    const invoice = query["invoice"];
    if (status) {
        switch (query["dispatch.status"]) {
            case "backorder":
                whereAnd.push({
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
    if (query["invoice"]) {
        switch (query["invoice"]) {
            case "pending":
                whereAnd.push({
                    amountDue: { gt: 0 },
                });
                break;
            case "paid":
                whereAnd.push({
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
                whereAnd.push({
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
                whereAnd.push({
                    AND: [
                        {
                            amountDue: {
                                gt: 1,
                            },
                        },
                        {
                            NOT: {
                                amountDue: {
                                    equals: prisma.salesOrders.fields
                                        .grandTotal,
                                },
                            },
                        },
                    ],
                });
            case "overdraft":
                whereAnd.push({
                    amountDue: {
                        lt: 0,
                    },
                });
                break;
        }
    }
    whereAnd.push({
        type: query["sales.type"],
    });
    const keys = Object.keys(query) as FilterKeys[];
    keys.map((k) => {
        const val = query?.[k] as any;
        if (!query?.[k]) return;
        switch (k) {
            case "address.id":
                whereAnd.push({
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
                let id = String(query.id);
                if (id?.includes(","))
                    whereAnd.push({
                        id: {
                            in: id?.split(",").map((s) => Number(s)),
                        },
                    });
                else
                    whereAnd.push({
                        id: query.id,
                    });
                break;
            case "order.no":
                if (val?.includes(","))
                    whereAnd.push({
                        orderId: {
                            in: val?.split(","),
                        },
                    });
                else
                    whereAnd.push({
                        orderId: {
                            contains: val,
                        },
                    });
                break;
            case "po":
                whereAnd.push({
                    meta: {
                        path: "$.po",
                        // equals: query.po,
                        string_contains: val,
                    },
                });
                break;
            case "customer.id":
                whereAnd.push({
                    customerId: val,
                });
                break;
            case "customer.name":
                whereAnd.push({
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
                const _phoneQuery = {
                    phoneNo: val,
                };
                whereAnd.push({
                    OR: [
                        {
                            customer: _phoneQuery,
                        },
                        {
                            customer: {
                                phoneNo2: val,
                            },
                        },
                        {
                            billingAddress: _phoneQuery,
                        },
                        {
                            shippingAddress: _phoneQuery,
                        },
                    ],
                });
                break;
            case "salesRep.id":
                whereAnd.push({
                    salesRepId: val,
                });
                break;
            case "sales.rep":
                whereAnd.push({
                    salesRep: {
                        name: val,
                    },
                });
                break;
            case "sales.priority":
                if (val == SalesPriority.NORMAL)
                    whereAnd.push({
                        OR: [{ priority: null }, { priority: val }],
                    });
                whereAnd.push({
                    priority: val,
                });
                break;
            case "production.assignedToId":
                whereAnd.push({
                    assignments: {
                        some: {
                            deletedAt: null,
                            assignedToId: val,
                        },
                    },
                });
                break;
        }
    });
    const prodStatus = query["production.status"];
    const assignedToId = query["production.assignedToId"];
    switch (prodStatus) {
        case "completed":
            whereAnd.push({
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
            whereAnd.push({
                assignments: {
                    some: {
                        deletedAt: null,
                    },
                },
            });
        case "due today":
            whereAnd.push({
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
            whereAnd.push({
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

    switch (query["production.assignment"]) {
        case "all assigned":
            break;
        case "not assigned":
            whereAnd.push({
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

    if (query["account.no"])
        whereAnd.push({
            customer: {
                phoneNo: query["account.no"],
            },
        });

    return composeQuery(whereAnd);
}
function whereSearch(query): Prisma.SalesOrdersWhereInput | null {
    const inputQ = { contains: query || undefined } as any;
    const parsedQ = parseSearchQuery(query);
    if (parsedQ) {
        return {
            items: {
                some: {
                    OR: [
                        { description: query },
                        { description: parsedQ.otherQuery },
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
                                                contains: parsedQ.otherQuery,
                                            },
                                        },
                                    },
                                    {
                                        molding: {
                                            title: {
                                                contains: parsedQ.otherQuery,
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
    if (query) {
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
export function parseSearchQuery(_query) {
    let itemSearch = null;
    if (_query?.startsWith("item:")) {
        itemSearch = _query.split("item:")[1]?.trim();
        // return {
        //     itemSearch,
        // };
    }
    if (!itemSearch) return null;
    const sizePattern = /\b(\d+-\d+)\s*x\s*(\d+-\d+)\b/;
    const match = itemSearch.match(sizePattern);

    let size = "";
    let otherQuery = itemSearch;

    if (match) {
        size = match[0];
        otherQuery = itemSearch.replace(sizePattern, "").trim();
    }
    const spl = size.trim().split(" ");
    if (size && spl.length == 3) {
        size = `${ftToIn(spl[0])} x ${ftToIn(spl[2])}`;
    }

    return {
        size: size,
        otherQuery: otherQuery,
        originalQuery: itemSearch,
    };
}
