import type { Prisma } from "@gnd/db";
import type { SalesQueryParamsSchema } from "./schemas/sales";
import { composeQuery } from "./query-response";

export function whereSales(query: SalesQueryParamsSchema) {
  const where: Prisma.SalesOrdersWhereInput[] = [];

  Object.entries(query).map(([k, v]) => {
    switch (k as keyof SalesQueryParamsSchema) {
      case "salesNo":
        break;
      case "salesIds":
        if (query.salesIds?.length)
          where.push({
            id: {
              in: query.salesIds,
            },
          });
        break;
    }
  });
  return composeQuery(where);
}
