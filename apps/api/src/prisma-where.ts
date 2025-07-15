import type { Prisma } from "@gnd/db";
import type { SalesQueryParamsSchema } from "./schemas/sales";
import { composeQuery } from "./query-response";
import type { DispatchQueryParamsSchema } from "./schemas/dispatch";
import type { SalesDispatchStatus } from "@gnd/utils/constants";
export function whereDispatch(query: DispatchQueryParamsSchema) {
  const whereStack: Prisma.OrderDeliveryWhereInput[] = [
    {
      deletedAt: null,
    },
  ];
  switch (query?.status as SalesDispatchStatus) {
    default:
      whereStack.push({
        status: {
          in: ["in progress", "queue"] as SalesDispatchStatus[],
        },
      });
      break;
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
