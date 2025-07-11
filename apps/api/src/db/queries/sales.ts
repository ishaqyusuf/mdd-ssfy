import { whereSales } from "@api/prisma-where";
import { composeQueryData } from "@api/query-response";
import type { SalesQueryParamsSchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";

export async function getSales(
  ctx: TRPCContext,
  query: SalesQueryParamsSchema,
) {
  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSales(query),
    db.salesOrders,
  );
  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      orderId: true,
      createdAt: true,
      customer: {
        select: {
          businessName: true,
          name: true,
          address: true,
          phoneNo: true,
        },
      },
      salesRep: {
        select: {
          name: true,
        },
      },
    },
  });

  return await response(data);
}
