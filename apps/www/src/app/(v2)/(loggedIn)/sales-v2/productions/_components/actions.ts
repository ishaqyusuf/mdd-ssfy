"use server";

import { paginatedAction } from "@/app/_actions/get-action-utils";
import { dateEquals, fixDbTime } from "@/app/(v1)/_actions/action-utils";
import { serverSession } from "@/app/(v1)/_actions/utils";
import { prisma, Prisma } from "@/db";
import { formatDate } from "@/lib/use-day";
import { sum } from "@/lib/utils";
import { DeliveryOption, IAddressMeta, ISalesType } from "@/types/sales";
import dayjs from "dayjs";

import salesData from "../../../sales/sales-data";

interface Props {
    production?: boolean;
    query?: {
        _q?: string;
        dueToday?: boolean;
        pastDue?: boolean;
        deliveryOption?: DeliveryOption;
    };
}
export async function _getProductionList({ query, production = false }: Props) {
    // unstable_noStore();
    const session = await serverSession();
    const authId = session.user.id;
    const { can } = session;
    production =
        production || (can.editOrderProduction && !can.viewOrderProduction);
    const searchQuery = query?._q ? { contains: query?._q } : undefined;
    const dueDate = query?.dueToday
        ? dateEquals(formatDate(dayjs(), "YYYY-MM-DD"))
        : query?.pastDue
          ? {
                lt: fixDbTime(dayjs()).toISOString(),
            }
          : undefined;

    // return prisma.$transaction(async (tx) => {
    const itemsFilter: Prisma.SalesOrderItemsListRelationFilter = {
        some: {
            OR: [
                {
                    salesDoors: {
                        some: {
                            doorType: {
                                in: salesData.productionDoorTypes,
                            },
                        },
                    },
                },
                {
                    swing: {
                        not: null,
                    },
                },
                {
                    dykeProduction: true,
                },
            ],
        },
    };
    const assignedToId = !production ? undefined : authId;

    const where: Prisma.SalesOrdersWhereInput =
        query?.dueToday || query.pastDue
            ? {
                  type: "order" as ISalesType,
                  items: itemsFilter,
                  assignments: {
                      some: {
                          deletedAt: null,
                          assignedToId,
                          dueDate,
                          OR: [
                              {
                                  qtyAssigned: {
                                      gt: 0,
                                  },
                              },
                              {
                                  rhQty: {
                                      gt: 0,
                                  },
                              },
                              {
                                  lhQty: {
                                      gt: 0,
                                  },
                              },
                          ],
                      },
                  },
              }
            : {
                  type: "order" as ISalesType,
                  OR: searchQuery
                      ? [
                            {
                                orderId: searchQuery,
                            },
                            {
                                assignments: {
                                    some: {
                                        assignedToId,
                                        deletedAt: null,
                                        OR: [
                                            {
                                                qtyAssigned: {
                                                    gt: 0,
                                                },
                                            },
                                            {
                                                rhQty: {
                                                    gt: 0,
                                                },
                                            },
                                            {
                                                lhQty: {
                                                    gt: 0,
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                            {
                                customer: {
                                    OR: [
                                        {
                                            businessName: searchQuery,
                                        },
                                        {
                                            name: searchQuery,
                                        },
                                    ],
                                },
                            },
                        ]
                      : undefined,
                  assignments: {
                      some: production
                          ? {
                                deletedAt: null,
                                assignedToId: authId,
                                qtyAssigned: {
                                    gt: 0,
                                },
                                // dueDate,
                            }
                          : {},
                  },

                  items: itemsFilter,
              };

    const { pageCount, skip, take } = await paginatedAction(
        query,
        prisma.salesOrders,
        where,
    );
    const data = await prisma.salesOrders.findMany({
        where,
        skip,
        take,
        include: {
            items: {
                where: {
                    deletedAt: null,
                    // swing: { not: null },
                },
            },
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
                    assignedToId,
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
                },
            },
            billingAddress: {
                select: {
                    id: true,
                    name: true,
                    address1: true,
                    meta: true,
                },
            },
            shippingAddress: {
                select: {
                    id: true,
                    name: true,
                    phoneNo: true,

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
        },
        orderBy: {
            createdAt: "desc",
        },
        // const productions =
    });

    let orders = data.map((order) => {
        const resp = {
            ...order,
            _meta: {
                totalDoors: sum(
                    order.isDyke
                        ? [
                              ...order.doors.map((d) =>
                                  sum([d.lhQty, d.rhQty]),
                              ),
                              ...order.items.map((i) =>
                                  i.dykeProduction ? i.qty : 0,
                              ),
                          ]
                        : order.items?.filter((i) => i.swing).map((i) => i.qty),
                ),
            },
            customer: {
                ...order.customer,
                meta: {
                    // ...(order.meta)
                },
            },
            shippingAddress: {
                ...order.shippingAddress,
                meta: order.shippingAddress?.meta as any as IAddressMeta,
            },
        };
        const totalDoors = resp._meta.totalDoors;
        const submitted = sum(
            resp.assignments.map((a) =>
                sum(a.submissions.map((s) => sum([s.lhQty, s.rhQty]))),
            ),
        );

        return {
            ...resp,
            totalDoors,
            submitted,
            completed: totalDoors == submitted,
        };
    });
    return {
        data: orders.filter((a) =>
            query.pastDue || query.dueToday ? !a.completed : true,
        ),
        pageCount,
    };
    // });
}
