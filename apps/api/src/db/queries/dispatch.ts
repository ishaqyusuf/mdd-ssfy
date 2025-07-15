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
    // skip: 20,
    // take: 20,
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
  console.log({ result: data?.length, searchMeta, where });

  return await response(
    data.map((a) => ({
      ...a,
      uid: String(a.id),
    })),
  );
}
