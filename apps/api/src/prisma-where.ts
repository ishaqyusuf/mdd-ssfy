import type { Prisma } from "@gnd/db";
import type { SalesQueryParamsSchema } from "./schemas/sales";
import { composeQuery } from "./query-response";
import type { DispatchQueryParamsSchema } from "./schemas/dispatch";
import type { SalesDispatchStatus } from "@gnd/utils/constants";
import type { EmployeesQueryParams } from "./schemas/hrm";
import { addSpacesToCamelCase } from "@gnd/utils";
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
