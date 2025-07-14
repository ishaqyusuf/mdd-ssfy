import { whereDispatch } from "@api/prisma-where";
import { composeQueryData } from "@api/query-response";
import type { DispatchQueryParamsSchema } from "@api/schemas/dispatch";
import type { TRPCContext } from "@api/trpc/init";

export async function getDispatch(
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
    select: {},
  });
  return await response(data);
}
