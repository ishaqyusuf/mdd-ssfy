import { whereDispatch } from "@api/prisma-where";
import { composeQueryData } from "@api/query-response";
import type { DispatchQueryParamsSchema } from "@api/schemas/dispatch";
import type { TRPCContext } from "@api/trpc/init";

export async function getDispatches(
  ctx: TRPCContext,
  query: DispatchQueryParamsSchema,
) {
  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereDispatch(query),
    db.orderDelivery,
  );
  const data = await db.orderDelivery.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      status: true,
      createdAt: true,
      order: {
        select: {
          orderId: true,
          id: true,
          customer: {
            select: {
              name: true,
              businessName: true,
              phoneNo: true,
            },
          },
        },
      },
      driver: {
        select: {
          name: true,
        },
      },
    },
  });
  return await response(data);
}
