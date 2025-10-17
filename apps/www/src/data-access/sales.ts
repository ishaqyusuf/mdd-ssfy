import {
    anyDateQuery,
    dateQuery,
    getPageInfo,
    queryFilter,
} from "@/app/(v1)/_actions/action-utils";
import salesData from "@/app/(v2)/(loggedIn)/sales/sales-data";
import { prisma, Prisma } from "@/db";
import { ftToIn, sum } from "@/lib/utils";
import { BaseQuery, PageQuery } from "@/types/action";
import {
    DeliveryOption,
    IAddressMeta,
    ISalesType,
    SalesStatus,
} from "@/types/sales";
import dayjs from "dayjs";

export interface SalesQueryParams extends BaseQuery {
    _q?;
    _backOrder?: boolean;
    _noBackOrder?: boolean;
    _withDeleted?: boolean;
    sort?: "customer" | "status" | "prodDueDate";
    sort_order?: "asc" | "desc" | undefined;
    dealerId?;
    _customerId?;
    status?: SalesStatus;
    statusNot?;
    _payment?: "Paid" | "Part" | "Pending";
    prodId?;
    _page?: "production" | undefined;
    type?: ISalesType;
    _dateType?: "createdAt" | "prodDueDate";
    deliveryOption?: DeliveryOption;
    _salesRepId?;
    _deliveryStatus?:
        | "pending production"
        | "pending"
        | "ready"
        | "transit"
        | "queued"
        | "delivered";
}
export type GetSales = Awaited<ReturnType<typeof getSales>>;
export type SalesItem = GetSales["data"][number];
export async function getSales(query: SalesQueryParams) {
    const where = await whereSales(query);
    const _items = await prisma.salesOrders.findMany({
        where,
        ...(await queryFilter(query)),
        include: SalesInclude,
    });
    const pageInfo = await getPageInfo(query, where, prisma.salesOrders);
    function transformOrder(order: (typeof _items)[number]) {
        return {
            ...order,
            _meta: {
                totalDoors: sum(
                    order.isDyke
                        ? order.doors.map((d) => sum([d.lhQty, d.rhQty]))
                        : order.items?.filter((i) => i.swing).map((i) => i.qty),
                ),
            },
            customer: {
                ...order.customer,
                meta: {
                    // ...(order?.customer?.)
                },
            },
            shippingAddress: {
                ...order.shippingAddress,
                meta: order.shippingAddress?.meta as any as IAddressMeta,
            },
        };
    }
    return {
        pageInfo,
        pageCount: pageInfo.pageCount,
        data: _items.map(transformOrder),
    };
}
export async function whereSales(query: SalesQueryParams) {
    let {
        _q,
        _dateType = "createdAt",
        status,
        date,
        from,
        to,
        prodId,
        _payment,
        _deliveryStatus,
        deliveryOption,
        _withDeleted,
        dealerId,
        // isDyke,
        type = "order",
    } = query;
    let itemSearch = null;

    if (_q?.startsWith("item:")) {
        itemSearch = _q.split("item:")[1].trim();
        _q = null;
    }
    const inputQ = { contains: _q || undefined } as any;
    function parseSearchQuery(query) {
        if (!query) return null;
        const sizePattern = /\b(\d+-\d+)\s*x\s*(\d+-\d+)\b/;
        const match = query.match(sizePattern);

        let size = "";
        let otherQuery = query;

        if (match) {
            size = match[0];
            otherQuery = query.replace(sizePattern, "").trim();
        }
        const spl = size.trim().split(" ");
        if (size && spl.length == 3) {
            size = `${ftToIn(spl[0])} x ${ftToIn(spl[2])}`;
        }

        return {
            size: size,
            otherQuery: otherQuery,
            originalQuery: query,
        };
    }
    const parsedQ = parseSearchQuery(itemSearch);

    const where: Prisma.SalesOrdersWhereInput = {
        OR:
            itemSearch && parsedQ
                ? [
                      {
                          items: {
                              some: {
                                  OR: [
                                      { description: inputQ },
                                      { description: parsedQ.otherQuery },
                                      {
                                          salesDoors: {
                                              some: {
                                                  dimension: parsedQ.size
                                                      ? {
                                                            contains:
                                                                parsedQ.size,
                                                        }
                                                      : undefined,
                                              },
                                          },
                                          housePackageTool: {
                                              OR: [
                                                  {
                                                      door: {
                                                          title: {
                                                              contains:
                                                                  parsedQ.otherQuery,
                                                          },
                                                      },
                                                  },
                                                  {
                                                      molding: {
                                                          title: {
                                                              contains:
                                                                  parsedQ.otherQuery,
                                                          },
                                                      },
                                                  },
                                              ],
                                          },
                                      },
                                  ],
                              },
                          },
                      },
                  ]
                : !_q
                  ? undefined
                  : [
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
        type,
        ...dateQuery({ from, to, _dateType, date }),
    };
    if (dealerId)
        where.customer = {
            auth: {
                id: dealerId,
            },
        };
    if (_withDeleted) {
        where.deletedAt = anyDateQuery();
    }
    if (_q && Number(_q) > 0) {
        where.OR?.push({
            grandTotal: {
                gte: Number(_q),
                lt: Number(_q) + 2,
            },
        });
    }
    if (query._backOrder)
        where.orderId = {
            endsWith: "-bo",
        };
    if (query._noBackOrder)
        where.orderId = {
            not: {
                endsWith: "-bo",
            },
        };

    if (query.deliveryOption) where.deliveryOption = query.deliveryOption;
    if (prodId) where.prodId = prodId;

    if (status) {
        if (status == "Evaluating") {
            where.status = status;
        } else {
            const statusIsArray = Array.isArray(status);
            if (status == "Unassigned") where.prodId = null;
            else if (status == "Inbound") {
                where.prodId = {
                    gt: 0,
                };
                // where.prod
            } else if (status == "Late") {
                where.prodStatus = {
                    notIn: ["Completed"],
                };
                where.prodDueDate = {
                    lt: dayjs().subtract(1).toISOString(),
                };
            } else
                where.prodStatus = {
                    equals: statusIsArray ? undefined : status,
                    in: statusIsArray ? (status as any) : undefined,
                };
        }
    }
    if (query.statusNot)
        where.status = {
            not: query.statusNot,
        };
    if (_payment == "Paid") where.amountDue = 0;
    else if (_payment == "Pending")
        where.amountDue = {
            gt: 0,
        };
    if (query._page == "production") {
        if (!prodId) {
            where.prodId = {
                gt: 1,
            };
        }
    }

    if (query._customerId) where.customerId = +query._customerId;
    switch (_deliveryStatus) {
        case "delivered":
            // where.OR?.push({
            //     OR: [
            //         {deliveredAt: {not: ''}},
            //     ]
            // })
            where.status = "Delivered";
            break;
        case "queued":
            where.prodStatus = "Completed";
            where.status = {
                notIn: ["In Transit", "Return", "Delivered", "Ready"],
            };
            break;
        case "pending production":
            if (!where.OR) where.OR = [];

            where.OR.push({
                OR: [
                    {
                        prodStatus: {
                            notIn: ["Completed"],
                        },
                    },
                    {
                        prodStatus: null,
                    },
                ],
            });
            // where.prodStatus = {
            //     notIn: ["Completed"],
            // };
            break;
        case "ready":
            where.status = "Ready";
            // where.status = {
            //   notIn: ['In Transit','Return','Delivered']
            // }
            break;
        case "transit":
            where.status = "In Transit";
            break;
    }
    if (query._salesRepId) where.salesRepId = +query._salesRepId;
    return where;
}

export interface SalesQueryParam2 extends PageQuery {
    _q?: string;
    _type?: ISalesType;
}
export type GetAllSales = Awaited<ReturnType<typeof getAllSales>>;
export async function getAllSales(query: SalesQueryParam2) {
    const where = allSalesQuery(query);
    const sales = await prisma.salesOrders.findMany({
        where,
        ...(await queryFilter(query)),
        include: SalesInclude,
    });
    const pageInfo = await getPageInfo(query, where, prisma.salesOrders);
    return {
        pageInfo,
        data: sales,
        pageCount: pageInfo.pageCount,
    };
}

function allSalesQuery(query: SalesQueryParam2) {
    const where: Prisma.SalesOrdersWhereInput = {};

    return where;
}
const SalesInclude = {
    // customer: true,
    // shippingAddress: true,
    // billingAddress: true,
    producer: true,
    // salesRep: true,
    pickup: true,
    items: {
        where: {
            swing: {
                not: null,
            },
        },
        select: {
            description: true,
            prebuiltQty: true,
            id: true,
            qty: true,
            swing: true,
            prodCompletedAt: true,
            dykeProduction: true,
            meta: true,
        },
    },
    // items: {
    //     where: {
    //         deletedAt: null,
    //         swing: { not: null },
    //     },
    // },
    // productionStatus: true,
    doors: {
        where: {
            deletedAt: null,
            housePackageTool: {
                doorType: {
                    in: salesData.productionDoorTypes,
                },
            },
        },
        select: {
            id: true,
            doorType: true,
            lhQty: true,
            rhQty: true,
            totalQty: true,
        },
    },
    assignments: {
        where: {
            deletedAt: null,
            item: {
                deletedAt: null,
            },
        },
        include: {
            assignedTo: {
                select: {
                    name: true,
                    id: true,
                },
            },
            salesDoor: {
                select: {
                    id: true,
                    housePackageTool: {
                        select: {
                            door: {
                                select: {
                                    id: true,
                                    title: true,
                                    img: true,
                                },
                            },
                        },
                    },
                },
            },
            submissions: {
                where: {
                    deletedAt: null,
                },
                select: {
                    id: true,
                    qty: true,
                    rhQty: true,
                    lhQty: true,
                },
            },
        },
    },
    customer: {
        select: {
            id: true,
            businessName: true,
            name: true,
            phoneNo: true,
            email: true,
        },
    },
    billingAddress: {
        select: {
            id: true,
            name: true,
            address1: true,
            email: true,
            meta: true,
            phoneNo: true,
        },
    },
    shippingAddress: {
        select: {
            id: true,
            name: true,
            phoneNo: true,
            email: true,
            meta: true,
            address1: true,
        },
    },
    salesRep: {
        select: {
            id: true,
            name: true,
        },
    },
} satisfies Prisma.SalesOrdersInclude;
