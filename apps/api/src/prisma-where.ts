import { SalesPriority, type Prisma } from "@gnd/db";
import type { SalesQueryParamsSchema } from "./schemas/sales";
import { composeQuery } from "./query-response";
import type { DispatchQueryParamsSchema } from "./schemas/dispatch";
import type { SalesDispatchStatus } from "@gnd/utils/constants";
import type { EmployeesQueryParams } from "./schemas/hrm";
import { addSpacesToCamelCase } from "@gnd/utils";
import type { QtyControlByType, QtyControlType } from "./type";
import { anyDateQuery, dateEquals, fixDbTime } from "./utils/db";
import dayjs from "@gnd/utils/dayjs";
import { env } from "process";
export function whereDispatch(query: DispatchQueryParamsSchema) {
  const whereStack: Prisma.OrderDeliveryWhereInput[] = [];
  switch (query?.status as SalesDispatchStatus) {
    case "missing items":
    case "in progress":
    case "queue":
    case "completed":
    case "cancelled":
      whereStack.push({
        status: query?.status!,
      });
      break;
    default:
      whereStack.push({
        status: {
          in: ["in progress", "queue"] as SalesDispatchStatus[],
        },
      });
      break;
  }
  if (query.driversId?.length && env.NODE_ENV === "production")
    whereStack.push({
      driverId: {
        in: query.driversId,
      },
    });
  if (query.q) {
    const contains = { contains: query.q };
    whereStack.push({
      OR: [
        {
          order: {
            OR: [
              {
                orderId: contains,
              },
              {
                customer: {
                  OR: [
                    {
                      phoneNo: contains,
                    },
                    {
                      businessName: contains,
                    },
                    {
                      name: contains,
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  }

  return composeQuery(whereStack);
}
export function whereSales(query: SalesQueryParamsSchema) {
  const where: Prisma.SalesOrdersWhereInput[] = [];

  Object.entries(query).map(([k, v]) => {
    if (v === null) return;
    switch (k as keyof SalesQueryParamsSchema) {
      case "salesType":
        where.push({
          type: query.salesType,
        });
        break;
      case "salesNo":
        where.push({
          orderId: query.salesNo!,
        });
        break;
      case "q":
        const searchQ = searchSales(v);
        if (searchQ) where.push(searchQ);
        break;
      case "salesNos":
        if (query.salesNos?.length)
          where.push({
            orderId: {
              in: query.salesNos!,
            },
          });
        break;
      case "salesIds":
        if (query.salesIds?.length)
          where.push({
            id: {
              in: query.salesIds,
            },
          });
        if (Array.isArray(query.salesIds) && !query?.salesIds.length)
          where.push({
            id: {
              lte: 0,
            },
          });
        break;
    }
  });
  if (query["with.trashed"]) where.push({ deletedAt: { not: null } });
  if (query["trashed.only"])
    where.push({
      deletedAt: anyDateQuery(),
    });
  const q = query.q;
  if (q) {
    const searchQ = searchSales(q);
    if (searchQ) where.push(searchQ);
  }
  if (query["dealer.id"])
    where.push({
      customer: {
        auth: {
          id: query["dealer.id"],
        },
      },
    });
  const statType = (type: QtyControlType) => type;
  const status = query["dispatch.status"];
  if (status) {
    // switch (query["dispatch.status"]) {
    //   case "backorder":
    //     where.push({
    //       stat: {
    //         some: {
    //           type: statType("dispatchCompleted"),
    //           AND: [
    //             {
    //               percentage: {
    //                 gt: 0,
    //               },
    //             },
    //             {
    //               percentage: {
    //                 lt: 100,
    //               },
    //             },
    //           ],
    //         },
    //       },
    //     });
    //     break;
    // }
  }

  if (query["sales.type"]) {
    where.push({
      type: query["sales.type"],
    });
  }

  const keys = Object.keys(query) as (keyof SalesQueryParamsSchema)[];
  keys.map((k) => {
    const val = query?.[k] as any;
    if (!val) return;
    switch (k) {
      // case "address.id":
      //   where.push({
      //     OR: [
      //       {
      //         billingAddressId: val,
      //       },
      //       {
      //         shippingAddressId: val,
      //       },
      //     ],
      //   });
      //   break;
      // case "id":
      //   let id = String(query.id);
      //   if (id?.includes(","))
      //     where.push({
      //       id: {
      //         in: id?.split(",").map((s) => Number(s)),
      //       },
      //     });
      //   else
      //     where.push({
      //       id: Number(query.id),
      //     });
      //   break;
      case "order.no":
      case "salesNo":
        if (val?.includes(","))
          where.push({
            orderId: {
              in: val?.split(","),
            },
          });
        else
          where.push({
            orderId: {
              contains: val,
            },
          });
        break;
      case "po":
        where.push({
          meta: {
            path: "$.po",
            string_contains: val,
          },
        });
        break;
      // case "customer.id":
      //   where.push({
      //     customerId: val,
      //   });
      //   break;
      case "customer.name":
        where.push({
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
        const _phonequery = {
          phoneNo: val,
        };
        where.push({
          OR: [
            {
              customer: _phonequery,
            },
            {
              customer: {
                phoneNo2: val,
              },
            },
            {
              billingAddress: _phonequery,
            },
            {
              shippingAddress: _phonequery,
            },
          ],
        });
        break;
      // case "salesRep.id":
      //   where.push({
      //     salesRepId: val,
      //   });
      //   break;
      case "sales.rep":
        where.push({
          salesRep: {
            name: val,
          },
        });
        break;
      // case "sales.priority":
      //   if (val == SalesPriority.NORMAL)
      //     where.push({
      //       OR: [{ priority: null }, { priority: val }],
      //     });
      //   else {
      //     where.push({
      //       priority: val,
      //     });
      //   }
      //   break;
      // case "production.assignedToId":
      //   where.push({
      //     assignments: {
      //       some: {
      //         deletedAt: null,
      //         assignedToId: val,
      //       },
      //     },
      //   });
      //   break;
    }
  });
  const prodStatus = query["production.status"];
  const production = query["production"];
  switch (production) {
    case "pending":
      where.push({
        stat: {
          some: {
            total: {
              gt: 0,
            },
            type: "prodCompleted" as QtyControlType,
            percentage: {
              lt: 100,
            },
          },
        },
      });
      break;
  }
  const assignedToId = query["production.assignedToId"];
  switch (prodStatus) {
    case "completed":
      where.push({
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
      break;
    case "part assigned":
      where.push({
        assignments: {
          some: {
            deletedAt: null,
          },
        },
      });
      break;
    case "due today":
      where.push({
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
            dueDate: dateEquals(dayjs().format("YYYY-MM-DD")),
          },
        },
      });
      break;
    case "past due":
      where.push({
        assignments: {
          some: {
            assignedToId: assignedToId || undefined,
            deletedAt: null,
            dueDate: {
              lt: fixDbTime(dayjs()).toISOString(),
            },
          },
        },
      });
      break;
  }

  switch (query["production.assignment"]) {
    case "all assigned":
      break;
    case "not assigned":
      where.push({
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
    where.push({
      customer: {
        phoneNo: query["account.no"],
      },
    });
  return composeQuery(where);
}
function searchSales(params): Prisma.SalesOrdersWhereInput | null {
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
  let itemSearch: any = null;
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
  // import ft to in
  // if (size && spl.length == 3) {
  //     size = `${ftToIn(spl[0])} x ${ftToIn(spl[2])}`;
  // }

  return {
    size: size,
    otherparams: otherparams,
    originalparams: itemSearch,
  };
}
export function whereEmployees(params: EmployeesQueryParams) {
  const wheres: Prisma.UsersWhereInput[] = [];
  const { can, cannot, roles } = params;
  if (can?.length) {
    const wherePermissions: Prisma.PermissionsWhereInput[] = [];
    can.map((permission) => {
      const name = addSpacesToCamelCase(permission).toLocaleLowerCase();
      wherePermissions.push({
        name,
      });
    });
    wheres.push({
      roles: {
        some: {
          role:
            wherePermissions?.length > 1
              ? {
                  AND: wherePermissions.map((permission) => ({
                    RoleHasPermissions: {
                      some: {
                        permission,
                      },
                    },
                  })),
                }
              : {
                  RoleHasPermissions: {
                    some: {
                      permission: wherePermissions[0],
                    },
                  },
                },
        },
      },
    });
  }
  if (cannot?.length)
    wheres.push({
      roles: {
        some: {
          role: {
            RoleHasPermissions: {
              every: {
                AND: cannot?.map((p) => ({
                  permission: {
                    name: {
                      not: addSpacesToCamelCase(p).toLocaleLowerCase(),
                    },
                  },
                })),
              },
            },
          },
        },
      },
    });
  if (roles?.length) {
    wheres.push({
      roles: {
        some: {
          role:
            roles?.length == 1
              ? {
                  name: roles[0] as any,
                }
              : {
                  OR: roles.map((name) => ({ name })) as any,
                },
        },
      },
    });
  }
  return composeQuery(wheres);
}
