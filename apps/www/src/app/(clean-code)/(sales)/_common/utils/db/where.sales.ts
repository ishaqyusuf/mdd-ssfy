import {
    anyDateQuery,
    withDeleted,
} from "@/app/(clean-code)/_common/utils/db-utils";
import { dateEquals, fixDbTime } from "@/app/(v1)/_actions/action-utils";
import {
    FilterKeys,
    SearchParamsType,
} from "@/components/(clean-code)/data-table/search-params";
import { Prisma } from "@/db";
import { formatDate } from "@/lib/use-day";
import dayjs from "dayjs";

import { QtyControlType } from "../../../types";
import { composeQuery } from "../db-utils";
import { ftToIn } from "../sales-utils";

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

    if (query["dispatch.status"]) {
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
    whereAnd.push({
        type: query["sales.type"],
    });
    const keys = Object.keys(query) as FilterKeys[];
    keys.map((k) => {
        const val = query?.[k] as any;
        if (!query?.[k]) return;
        switch (k) {
            case "id":
                whereAnd.push({
                    id: query.id,
                });
                break;
            case "orderNo":
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
            case "sales.rep":
                whereAnd.push({
                    salesRep: {
                        name: val,
                    },
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
    switch (prodStatus) {
        case "due today":
            whereAnd.push({
                assignments: {
                    some: {
                        deletedAt: null,
                        dueDate: dateEquals(formatDate(dayjs(), "YYYY-MM-DD")),
                    },
                },
            });
            break;
        case "past due":
            whereAnd.push({
                assignments: {
                    some: {
                        deletedAt: null,
                        dueDate: {
                            lt: fixDbTime(dayjs()).toISOString(),
                        },
                    },
                },
            });
            // case ''
            break;
    }
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
